const child_process = require('child_process')
const Starter = require('../_common/Starter.js')

class Dockerrun extends Starter {
	constructor(currentPath) {
		super()
		this.currentPath = currentPath
		this.label = this.constructor.name
		this._startArray = []
		this._startObject = {}
	}
	
	async atStart() {
		try {
			await this.rabbitMQ.setAnotherChannel('dockerrun_started')
		} catch (err) {
			this.onError(this.label, 'atStart', err)
		}
	}
	
	onRabbitMqReceives(object, onDone) {
		if (object.type === 'start') {
			console.log(object)
			this.rabbitMQ.send('logger', {type: 'log', label: process.env.HOSTNAME, data: object})
			let date = Date.now()
			this._startArray.push(date)
			this._startObject[date] = { path: object.path, settings: object.settings, onDone }
			this._containerUp()
		} else if (object.type === 'started') {
			console.log(object)
			onDone(true)
			this.rabbitMQ.send('logger', {type: 'log', label: process.env.HOSTNAME, data: object})
			if (this._startObject[object.date]) {
				this._startObject[object.date].onDone(true)
				delete this._startObject[object.date]
			}
		}
	}
	
	_containerUp() {
		let date = this._startArray.shift()
		if (date) {
			this._setMarker(date)
		}
	}
	
	_setMarker(date) {
		return new Promise(success => {
			let data = this._startObject[date]
			let settings = ''
			if (data.settings) {
				settings = data.settings.join(' ')
			}
			let string = `${data.path} ${settings} ${date}`
			let cmd = `echo ${string} > ${this.currentPath}toRun/dockerToRun${date}.temp`
			this.rabbitMQ.send('logger', {type: 'log', label: process.env.HOSTNAME, data: cmd})
			child_process.exec(cmd, (err, stdout, stderr) => {
				if (err) {
					this.onError(this.label, '_setMarker child_process', err)
				} else {
					success()
				}
			})
		}).catch(err => {
			this.onError(this.label, '_setMarker', err)
		})
	}
}

module.exports = Dockerrun