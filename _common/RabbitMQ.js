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
					if (!channel.isClosedByError) {
						await channel.assertExchange(queueName, 'fanout', { durable: false })
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