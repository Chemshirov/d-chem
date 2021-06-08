const Main = require('./server/Main.js')
const RabbitMQ = require('../../../_common/RabbitMQ.js')
const Statistics = require('../../../_common/Statistics.js')

class Git {
	constructor() {
		this.label = this.constructor.name
		
		this.rabbitMQ = new RabbitMQ(this._onError.bind(this), this._rabbitMQreceive.bind(this))
		this.statistics = new Statistics(this._onError.bind(this), this.rabbitMQ)
		this.main = new Main(this._onError.bind(this), this.rabbitMQ)
		
		this._start()
	}
	
	_start() {
		return new Promise(async success => {
			this._setUnhandledErrorsHandler()
			await this.rabbitMQ.connect()
			await this.main.start()
			this.rabbitMQ.send('dockerrun_started', {
				type: 'started',
				path: process.env.AFTER_TILDA
			})
			this.statistics.started()
		}).catch(err => {
			this._onError(this.label, 'start', err)
		})
	}
	
	_setUnhandledErrorsHandler() {
		process.on('unhandledRejection', (error, promise) => {
			this._onError(this.label, 'unhandledRejection', error)
		})
		process.on('uncaughtException', error => {
			if (error && error.code !== 'ECONNREFUSED') {
				this._onError(this.label, 'uncaughtException', error)
			}
		})
	}
	
	_rabbitMQreceive(object, onDone) {
		onDone(true)
	}
	
	_onError(className, method, error) {
		this.rabbitMQ.send('logger', {type: 'error', className, method, error})
	}
}

module.exports = Git