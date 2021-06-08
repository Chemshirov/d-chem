const child_process = require('child_process')
const RabbitMQ = require('../_common/RabbitMQ.js')
const Statistics = require('../_common/Statistics.js')

class Dockerrun {
	constructor(currentPath) {
		this.currentPath = currentPath
		this.label = this.constructor.name
		
		this.rabbitMQ = new RabbitMQ(this._onError.bind(this), this._rabbitMQreceive.bind(this))
		this.statistics = new Statistics(this._onError.bind(this), this.rabbitMQ)
		
		this.startArray = []
		this.startObject = {}
		this._start()
	}
	
	_start() {
		this.rabbitMQ.connect().then(async () => {
			try {
				await this.rabbitMQ.setAnotherChannel('dockerrun_started')
				this.statistics.started()
			} catch (err) {
				this._onError(this.label, '_start', err)
			}
		})
	}
	
	_containerUp() {
		let path = this.startArray.shift()
		if (path && this.startObject.hasOwnProperty(path)) {
			this._setMarker(path)
		}
	}
	
	_setMarker(path) {
		return new Promise(success => {
			let date = Date.now()
			let settings = ''
			if (this.startObject[path].settings) {
				settings = this.startObject[path].settings.join(' ')
			}
			let string = `${path} ${settings}`
			let cmd = `echo ${string} > ${this.currentPath}toRun/dockerToRun${date}.temp`
			this.rabbitMQ.send('logger', {type: 'log', label: process.env.HOSTNAME, data: cmd})
			child_process.exec(cmd, (err, stdout, stderr) => {
				if (err) {
					this._onError(this.label, '_setMarker child_process', err)
				} else {
					success()
				}
			})
		}).catch(err => {
			this._onError(this.label, '_setMarker', err)
		})
	}
	
	_rabbitMQreceive(object, onDone) {
		if (object.type === 'start') {
			console.log(object)
			this.rabbitMQ.send('logger', {type: 'log', label: process.env.HOSTNAME, data: object})
			this.startArray.push(object.path)
			this.startObject[object.path] = { onDone, settings: object.settings }
			this._containerUp()
		} else if (object.type === 'started') {
			console.log(object)
			onDone(true)
			this.rabbitMQ.send('logger', {type: 'log', label: process.env.HOSTNAME, data: object})
			if (this.startObject[object.path]) {
				this.startObject[object.path].onDone(true)
				delete this.startObject[object.path]
			}
		}
	}
	
	_onError(className, method, error) {
		this.rabbitMQ.send('logger', {type: 'error', className, method, error})
	}
}

module.exports = Dockerrun