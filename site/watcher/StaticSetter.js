const { Worker } = require('worker_threads')

class StaticSetter { 
	constructor(onError, currentPath, rabbitMQ) {
		this._onError = onError
		this.currentPath = currentPath
		this.rabbitMQ = rabbitMQ
		this.label = this.constructor.name
	}
	
	start() {
		return new Promise(success => {
			let worker = new Worker(this.currentPath + 'StaticFilesWorker.js')
			worker.on('message', object => {
				if (object.type === 'error') {
					this._onError(object.className, object.method, object.error)
				} else if (object.type === 'done') {
					object.label = this.label
					this.rabbitMQ.send('logger', {type: 'log', label: process.env.HOSTNAME, data: object})
					worker.terminate()
					success()
				}
			})
			worker.on('error', error => {
				this._onError(this.label, 'worker error', error)
			})
		})
	}
}

module.exports = StaticSetter