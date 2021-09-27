const child_process = require('child_process')
const Settings = require('../../_common/Settings.js')

class StaticsSetter {
	constructor(setupObject) {
		this.onError = setupObject.onError
		this.log = setupObject.log
		this.rabbitMQ = setupObject.rabbitMQ
		this.label = this.constructor.name
		this.rabbitMQ.receive({
			label: 'Worker',
			callback: this._onWorkerMessage.bind(this)
		})
	}
	
	async start() {
		try {
			let allFileList = []
			let routeTable = Settings.staticRouteTable()
			let paths = Object.keys(routeTable)
			for (let i = 0; i < paths.length; i++) {
				let path = paths[i]
				let fileList = await this._getFiles(path)
				allFileList = allFileList.concat(fileList)
			}
			let onDoneLabel = this.label + 'Start'
			this._requestToAdd({ label: this.label, fileList: allFileList, atStart: true })
		} catch(error) {
			this.onError(this.label, 'start', error)
		}
	}
	
	addFile(filePath) {
		return new Promise(success => {
			if (!this._addFileDone) {
				this._addFileDone = {}
			}
			this._addFileDone[filePath] = success
			this._requestToAdd({ label: this.label, filePath })
			setTimeout(() => {
				success()
			}, Settings.standardTimeout)
		}).catch(error => {
			this.onError(this.label, 'addFile', error)
		})
	}
	
	async addList(path) {
		try {
			let fileList = await this._getFiles(path)
			this._requestToAdd({ label: this.label, fileList })
		} catch(error) {
			this.onError(this.label, 'addList', error)
		}
	}
	
	_getFiles(path) {
		return new Promise(success => {
			let files = []
			let cmd = `find ${path} -type f`
			child_process.exec(cmd, {maxBuffer: 1000 * 1000 * 10}, (error, stdout, stderr) => {
				if (error) {
					this.onError(this.label, '_getFiles child_process', error)
				} else {
					let array = stdout.split('\n')
					for (let i = 0; i < array.length; i++) {
						let filePath = array[i]
						if (filePath && !(/\.(mp[3-4]|map)$/).test(filePath)) {
							files.push(filePath)
						}
					}
					success(files)
				}
			})
		}).catch(error => {
			this.onError(this.label, '_getFiles', error)
		})
	}
	
	_requestToAdd(object) {
		let message = {
			request: 'changeStatic',
			method: 'add'
		}
		Object.keys(object).forEach(key => {
			message[key] = object[key]
		})
		this.rabbitMQ.send({ label: 'Worker', message })
	}
	
	_onWorkerMessage(object) {
		try {
			if (object.hasOwnProperty('result')) {
				if (object.label === this.label) {
					if (object.atStart) {
						this.log(this.label + ' has done')
						let message = {
							type: this.label + 'HasDone',
						}
						this._sendToBothStages('Dockerrun', message)
					} else {
						if (this._addFileDone && typeof this._addFileDone[object.filePath] === 'function') {
							this._addFileDone[object.filePath]()
							delete this._addFileDone[object.filePath]
						}
					}
					if (object.result) {
						object.stage = process.env.STAGE
						let label = 'Proxy'
						this._sendToBothStages(label, object)
					}
				}
			}
		} catch(error) {
			this.onError(this.label, '_onWorkerMessage', error)
		}
	}
	
	_sendToBothStages(label, message) {
		let rabbitHostNameEnding = '-rabbitmq'
		let dName = Settings.developmentStageName.substring(0, 1) + rabbitHostNameEnding
		this.rabbitMQ.send({ rabbitHostName: dName, label, message })
		let pName = Settings.productionStageName.substring(0, 1) + rabbitHostNameEnding
		this.rabbitMQ.send({ rabbitHostName: pName, label, message })
	}
}

module.exports = StaticsSetter