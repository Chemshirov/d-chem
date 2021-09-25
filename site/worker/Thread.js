const ChangeStatic = require('./scripts/ChangeStatic.js')
const child_process = require('child_process')
const Converter = require('./scripts/Converter.js')
const { parentPort } = require('worker_threads')

class Tread {
	constructor() { 
		this.label = this.constructor.name
		this.onError = this._onError.bind(this)
		this.log = this._log.bind(this)
		this._setMessageHandler()
	}
	
	async _changeStatic(object) {
		try {
			let ok = true
			let changeStatic = new ChangeStatic(this.onError, this.log)
			let fileList = []
			if (typeof object.fileList === 'object') {
				fileList = object.fileList
			} else {
				if (object.filePath) {
					fileList = [object.filePath]
				}
			}
			let addedFiles = []
			for (let i = 0; i < fileList.length; i++) {
				let filePath = fileList[i]
				let addedFilePath = await changeStatic.add(filePath)
				if (!addedFilePath) {
					ok = false
				} else {
					addedFiles[addedFilePath] = true
				}
			}
			let addedFilesArray = Object.keys(addedFiles)
			if (addedFilesArray.length) {
				ok = addedFilesArray
			}
			parentPort.postMessage({ type: 'done', data: ok })
		} catch (error) {
			this.onError(this.label, '_changeStatic', error)
		}
	}
	
	async _convertToH264(object) {
		try {
			let converter = new Converter(this.onError, this.log, object.filePath)
			let done = await converter.toH264()
			parentPort.postMessage({ type: 'done', data: done })
		} catch (error) {
			this.onError(this.label, '_convertToH264', error)
		}
	}
	
	async _execByCmd(object) {
		try {
			child_process.exec(object.cmd, (error, stdout, stderr) => {
				let ok = false
				if (error) {
					this.onError(this.label, '_execByCmd child_process', error)
				} else {
					ok = true
					this.log('Done', object.cmd)
				}
				parentPort.postMessage({ type: 'done', data: ok })
			})
		} catch (error) {
			this.onError(this.label, '_execByCmd', error)
		}
	}
	
	_setMessageHandler() {
		parentPort.on('message', object => {
			if (object.exec) {
				this['_' + object.exec].bind(this)(object.data)
			}
		})
	}
	
	_log() {
		parentPort.postMessage({ type: 'log', arguments: [...arguments] })
	}
	
	_onError(className, method, error) {
		parentPort.postMessage({ type: 'error', className, method, error })
	}
}

new Tread()