const { Worker } = require('worker_threads')
const Settings = require('./Settings.js')

class WorkerSetter {
	constructor(onError, log) {
		this.onError = onError
		this.log = log
		this._resetWorkerCount = 0
		this._setMethodsUniques = {}
	}
	
	setWorker(pathToWorkerClass, finite) {
		return new Promise(success => {
			this.worker = new Worker(pathToWorkerClass)
			this.worker.on('message', message => {
				if (message.type === 'error') {
					this.onError(this.label, 'worker', message)
					this._resetWorker(pathToWorkerClass, finite)
				} else
				if (message.type === 'restart') {
					this._resetWorker(pathToWorkerClass, finite)
				} else
				if (message.type === 'methods') {
					this._setMethods(message.methods)
					success()
				} else
				if (message.type === 'unique') {
					let success = this._setMethodsUniques[message.unique]
					if (typeof success === 'function') {
						success(message.result)
					}
				} else
				if (message.type === 'log') {
					let args = message.arguments
					this.log(...args)
				} else
				if (message.type === 'done') {
					this.worker.terminate()
					success(object)
				} else {
					if (typeof this.onMessage === 'function') {
						this.onMessage(message.type, message.object)
					}
				}
			})
			this.worker.on('error', error => {
				error.errorString = error.toString()
				this.onError(this.label, '_setWorker uncaught', error)
			})
			this.worker.postMessage({ _currentPath: this.currentPath })
		}).catch(error => {
			this.onError(this.label, '_setWorker', error)
		})
	}
	
	_resetWorker(pathToWorkerClass, finite) {
		this.log('resetting the worker', pathToWorkerClass)
		this.worker.terminate()
		setTimeout(async () => {
			try{
				await this.setWorker(pathToWorkerClass, finite, this._resetWorkerCount)
				if (typeof this.startWorker === 'function') {
					await this.startWorker()
				}
			} catch (error) {
				this.onError(this.label, 'startWorker', error)
			}
		}, this.resetTimeout || Settings.standardTimeout)
	}
	
	_setMethods(methods) {
		methods.forEach(methodName => {
			this.worker[methodName] = (object) => {
				return new Promise(success => {
					let unique = Date.now() + '_' + Math.random()
					this._setMethodsUniques[unique] = success
					this.worker.postMessage({ _methodName: methodName, unique, object })
				}).catch(error => {
					this.onError(this.label, methodName, error)
				})
			}
		})
	}
}

module.exports = WorkerSetter