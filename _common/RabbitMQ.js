const RabbitMQextension = require('./RabbitMQextension.js')
const Settings = require('./Settings.js')

class RabbitMQ extends RabbitMQextension {
	constructor(onError, log) {
		super(onError, log)
		this.label = this.constructor.name
	}
	
	async send(options) {
		try {
			let queueName = options.label || this.defaultQueueName
			let message = options.message
			if (this.defaultQueueName && !options.message) {
				message = options
			}
			if (queueName && message) { 
				let channel = await this.getChannel(options)
				if (channel) {
					if (!channel.isClosed) {
						try {
							await channel.assertExchange(queueName, 'fanout', { durable: false })
						} catch (error) {
							if (typeof error === 'object' && error.message === 'Channel closed') {
								this.log(error.message)
								// await this.reconnect(options)
								// await this.send(options)
							} else {
								this.onError(this.label, 'send assertExchange', error)
							}
						}
						let buffer = this.getFramedBuffer(message)
						channel.publish(queueName, '', buffer)
					}
				}
			}
		} catch(error) {
			this.onError(this.label, 'send', error)
		}
	}
	
	async receive(options) {
		try {
			let queueName = options.label || this.defaultQueueName
			let callback = options.callback
			if (this.defaultQueueName && typeof options === 'function') {
				callback = options
			}
			if (queueName && callback) {
				let channel = await this.getChannel(options)
				if (channel) {
					await channel.assertExchange(queueName, 'fanout', { durable: false })
					let queue = await channel.assertQueue('', { exclusive: true })
					await channel.bindQueue(queue.queue, queueName, '')
					await channel.consume(queue.queue, message => {
						let object = this.getObjectFromMessage(message) 
						callback(object)
					}, { noAck: true })
				}
			}
		} catch(error) {
			this.onError(this.label, 'receive', error)
		}
	}
}

module.exports = RabbitMQ