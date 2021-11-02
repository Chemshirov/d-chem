const Settings = require('../../_common/Settings.js')
const Starter = require('../../_common/Starter.js')
const { Worker: WorkerClass } = require('worker_threads')

class Worker extends Starter {
	constructor(currentPath) {
		super()
		this.currentPath = currentPath
		this.label = this.constructor.name
		this.sKey = this.label + 'Requests'
	}
	
	async atStart() {
		try {
			await this.rabbitMQ.receive(this._onReceive.bind(this))
			await this._onePerType()
		} catch(error) {
			this.onError(this.label, 'atStart', error)
		}
	}
	
	_onReceive(object) {
		if (object && object.request && !object.hasOwnProperty('result')) {
			this._onRequest(object)
		}
	}
	
	async _onRequest(object) {
		try {
			await this.redis.sadd(this.sKey + 'Types', object.request)
			await this.redis.sadd(this.sKey + object.request, JSON.stringify(object))
			this._onePerType()
		} catch(error) {
			this.onError(this.label, '_onRequest', error)
		}
	}
	
	async _onePerType() {
		try {
			let types = await this.redis.smembers(this.sKey + 'Types')
			if (types) {
				for (let i = 0; i < types.length; i++) {
					let type = types[i]
					this._oneByOne(type)
				}
			}
		} catch(error) {
			this.onError(this.label, '_onePerType', error)
		}
	}
	
	async _oneByOne(type) {
		try {
			if (!this._oneByOneBusy) {
				this._oneByOneBusy = {}
			}
			if (!this._oneByOneBusy[type]) {
				this._oneByOneBusy[type] = true
				let string = await this.redis.srandmember(this.sKey + type)
				if (string) {
					await this._requestHandler(string)
					await this.redis.srem(this.sKey + type, string)
					delete this._oneByOneBusy[type]
					await this._oneByOne(type)
				} else {
					delete this._oneByOneBusy[type]
				}
			} else {
				setTimeout(() => {
					this._oneByOne(type)
				}, Settings.standardTimeout)
			}
		} catch(error) {
			this.onError(this.label, '_oneByOne', error)
		}
	}
	
	async _requestHandler(string) {
		try {
			let resultObject = false
			let object = JSON.parse(string)
			if (typeof object.fileList === 'object') {
				resultObject = await this._fileListSplitter(string, object.fileList)
			} else {
				resultObject = await this._startThread(object)
			}
			if (resultObject) {
				let preventLabelInterferenceObject = { message: resultObject }
				this.rabbitMQ.send(preventLabelInterferenceObject)
			}
		} catch(error) {
			this.onError(this.label, '_requestHandler', error)
		}
	}
	
	async _fileListSplitter(string, fileList) {
		try {
			let threadsCount = process.env.CPUS || 2
			if (fileList.length < threadsCount) {
				threadsCount = fileList.length
			}
			let splittedArrays = {}
			fileList.forEach((filePath, i) => {
				let arrayAddress = i % threadsCount
				if (!splittedArrays[arrayAddress]) {
					splittedArrays[arrayAddress] = []
				}
				splittedArrays[arrayAddress].push(filePath)
			})
			let awaits = []
			let splittedArraysLength = Object.keys(splittedArrays).length
			for (let i = 0; i < splittedArraysLength; i++) {
				let smallerFileList = splittedArrays[i]
				let smallerObject = JSON.parse(string)
					smallerObject.fileList = smallerFileList
				let promise = new Promise(async success => {
					let smallerResultObject = await this._startThread(smallerObject)
					success(smallerResultObject)
				})
				awaits.push(promise)
			}
			return await this._awaitForLatest(awaits)
		} catch(error) {
			this.onError(this.label, '_fileListSplitter', error)
		}
	}
	
	_awaitForLatest(awaits) {
		let addedFiles = []
		return new Promise(success => {
			Promise.all(awaits).then(values => {
				values.forEach(object => {
					if (typeof object.result === 'object') {
						addedFiles = addedFiles.concat(object.result)
					}
				})
				let result = values.pop()
				result.result = addedFiles
				success(result)
			})
		}).catch(error => {
			this.onError(this.label, '_awaitForLatest', error)
		})
	}
	
	_startThread(object) {
		return new Promise(success => {
			let worker = new WorkerClass(this.currentPath + 'Thread.js')
			worker.on('message', message => {
				if (message.type === 'error') {
					worker.terminate()
					this.onError(this.label, '_startThread worker', message)
					setTimeout(() => {
						success()
					}, Settings.standardTimeout)
				} else
				if (message.type === 'log') {
					let args = message.arguments
					this.log(...args)
				} else
				if (message.type === 'done') {
					worker.terminate()
					object.result = message.data
					success(object)
				}
			})
			worker.on('error', error => {
				this.onError(this.label, '_startThread uncaught', error)
			})
			worker.postMessage({ exec: object.request, data: object })
		}).catch(error => {
			this.onError(this.label, '_startThread', error)
		})
	}
}

module.exports = Worker