const cluster = require('cluster')
const RabbitMQ = require('./RabbitMQ.js')
const Statistics = require('./Statistics.js')

class Starter {
	async start() {
		try {
			this.rabbitMQ = new RabbitMQ(this.onError.bind(this), this._rabbitMQreceive.bind(this))
			await this.rabbitMQ.connect()
			if (cluster.isPrimary) {
				this.statistics = new Statistics(this.onError.bind(this), this.rabbitMQ)
				await this.statistics.connect()
			}
			
			if (typeof this.atStart === 'function') {
				await this.atStart()
			}
			
			if (cluster.isPrimary) {
				if (process.env.EXTRA) {
					let data = { type: 'started', date: process.env.EXTRA }
					await this.rabbitMQ.send('dockerrun_started', data)
				}
				await this.statistics.started()
			}
		} catch(err) {
			this.onError(this.label, 'start', err)
		}
	}
	
	_rabbitMQreceive(object, onDone) {
		if (typeof this.onRabbitMqReceives === 'function') {
			this.onRabbitMqReceives(object, onDone)
		} else {
			onDone(true)
		}
	}
	
	onError(className, method, error) {
		this.rabbitMQ.send('logger', {type: 'error', className, method, error})
	}
}

module.exports = Starter