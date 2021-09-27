const { parentPort } = require('worker_threads')

class WorkerThreadSetter {
	constructor() {
		this.onError = this._onError.bind(this)
		this.log = this._log.bind(this)
		this._setMessageHandler()
	}
	
	post(object) {
		parentPort.postMessage({ type: 'post', object })
	}
	
	restart() {
		parentPort.postMessage({ type: 'restart' })
	}
	
	_setMessageHandler() {
		parentPort.on('message', async object => {
			try {
				if (object._currentPath) {
					this.currentPath = object._currentPath
					this._sendAvailableMethods()
				} else if (object._methodName) {
					if (typeof this[object._methodName] === 'function') {
						let result = await this[object._methodName](object.object)
						parentPort.postMessage({ type: 'unique', unique: object.unique, result })
					}
				} else {
					if (typeof this.onMessage === 'function') {
						this.onMessage(object)
					}
				}
			} catch (error) {
				this.onError(this.label, '_setMessageHandler', error)
			}
		})
	}
	
	_sendAvailableMethods() {
		let methods = {}
		Object.getOwnPropertyNames(Object.getPrototypeOf(this)).forEach(methodName => {
			if (methodName !== 'constructor' && !methodName.startsWith('_')) {
				methods[methodName] = true
			}
		})
		parentPort.postMessage({ type: 'methods', methods: Object.keys(methods) })
	}
	
	_log() {
		parentPort.postMessage({ type: 'log', arguments: [...arguments] })
	}
	
	_onError(className, method, error) {
		parentPort.postMessage({ type: 'error', className, method, error })
	}
}

module.exports = WorkerThreadSetter