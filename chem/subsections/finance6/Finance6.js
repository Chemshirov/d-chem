const RabbitMQ = require('../../../_common/RabbitMQ.js')
const Servers = require('./server/Servers.js')
const Settings = require('../../../_common/Settings.js')
const Statistics = require('../../../_common/Statistics.js')

class Finance6 {
	constructor(currentPath) {
		this.currentPath = currentPath
		this.label = this.constructor.name
		
		this.rabbitMQ = new RabbitMQ(this._onError.bind(this), this._rabbitMQreceive.bind(this))
		this.servers = new Servers(this._onError.bind(this), this.currentPath)
		this.statistics = new Statistics(this._onError.bind(this), this.rabbitMQ)
		
		this.start()
	}
	
	start() {
		return new Promise(async success => {
			await this.rabbitMQ.connect()
			await this.servers.start([Settings.port])
			this.rabbitMQ.send('dockerrun_started', {
				type: 'started',
				path: process.env.AFTER_TILDA
			})
			this.statistics.started()
		}).catch(err => {
			this._onError(this.label, 'start', err)
		})
	}
	
	_rabbitMQreceive(object, onDone) {
		onDone(true)
	}
	
	_onError(className, method, error) {
		this.rabbitMQ.send('logger', {type: 'error', className, method, error})
	}
}

module.exports = Finance6