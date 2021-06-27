const childProcess = require('child_process')
const chokidar = require('chokidar')
const Settings = require('../../../_common/Settings.js')
const Starter = require('../../../_common/Starter.js')

class Logs extends Starter {
	constructor(currentPath) {
		super()
		this.currentPath = currentPath
		this.label = this.constructor.name
	}
	
	async atStart() {
		try {
			this._setUnhandledErrorsHandler()
			chokidar.watch(this.currentPath + '.next').on('all', this._onFileChanged.bind(this))
			await this._spawn('next build')
			await this._spawn('next start -p 80')
		} catch (error) {
			this.onError(this.label, 'atStart', error)
		}
	}
	
	_spawn(cmd) {
		return new Promise(success => {
			let process = childProcess.spawn(`cd ${this.currentPath} && ${cmd}`, {shell: true})
			process.stdout.on('data', data => {
				let infoString = data.toString().trim()
				console.log(infoString)
				if (infoString.includes('ready - started server on')) {
					success()
				}
			})
			process.stderr.on('data', error => {
				let errorString = error.toString()
				if (errorString.includes('warn  - ')) {
					console.log(errorString)
				} else {
					this.onError(this.label, '_spawn ' + cmd, error)
				}
			})
			process.on('close', () => {
				success()
			})
		}).catch(error => {
			this.onError(this.label, '_spawn', error)
		})
	}
	
	_onFileChanged(event, path) {
		if (['add', 'change'].includes(event)) {
			this._addFiles(path)
		} else 
		if (event === 'unlink') {
			this._unlink(path)
		}
	}
	
	_addFiles(path) {
		let label = 'files'
		if (!this._addFilesInit) {
			this._addFilesInit = true
			let callback = (array) => {
				this.rabbitMQ.sendToAll('AddFilesToRouter', array)
			}
			this._holdOver(label, path, callback, Settings.staticInterval)
		} else {
			this._holdOver(label, path)
		}
	}
	
	_unlink(path) {
		let label = 'unlink'
		if (!this._unlinkInit) {
			this._unlinkInit = true
			let callback = (array) => {
				this.rabbitMQ.sendToAll('AddFilesToRouter', array, true)
			}
			this._holdOver(label, path, callback, Settings.staticInterval * 100)
		} else {
			this._holdOver(label, path)
		}
	}
	
	_holdOver(label, path, callback, timeout) {
		if (!this._holdOverObject) {
			this._holdOverObject = {}
		}
		if (!this._holdOverObject[label]) {
			this._holdOverObject[label] = {}
		}
		let object = this._holdOverObject[label]
		if (callback && timeout) {
			object.timeout = timeout
			object.callback = callback
		}
		if (!object.paths) {
			object.paths = {}
		}
		
		object.paths[path] = true
		if (object.ST) {
			clearTimeout(object.ST)
		}
		object.ST = setTimeout(() => {
			let holdOverArray = Object.keys(object.paths)
			object.paths = {}
			object.callback(holdOverArray)
		}, object.timeout)
	}
	
	_setUnhandledErrorsHandler() {
		process.on('unhandledRejection', error => {
			this.onError(this.label, 'unhandledRejection', error)
		})
		process.on('uncaughtException', error => {
			if (error && error.code !== 'ECONNREFUSED') {
				this.onError(this.label, 'uncaughtException', JSON.stringify(error))
			}
		})
	}
}

module.exports = Logs