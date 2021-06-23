const Settings = require('./Settings.js')

class RabbitMQ {
	constructor(Errors, callback, name) {
		this.Errors = Errors
		this.callback = callback
		
		this.label = this.constructor.name
		this.name = name || process.env.HOSTNAME
		
		this.amqplib = require('amqplib')
		this._onError()
	}
	
	async connect() {
		try {
			await this._connection()
			return this
		} catch(error) {
			this.Errors(this.label, 'connect', error)
		}
	}
	
	async setAnotherChannel(name) {
		try {
			await this._receive(this._devOrNotName(name))
		} catch(error) {
			this.Errors(this.label, 'setAnotherChannel', error)
		}
	}
	
	send(name, object, resend) {
		return new Promise(async success => {
			try {
				if (object.type === 'error') {
					console.log('Error', object)
				}
				let errorLoop = (name === 'logger' && object.type === 'error' && object.className === 'RabbitMQ')
				if (errorLoop) {
					setTimeout(() => {
						success()
					}, Settings.rabbitMqTimeout)
				} else {
					this._sendNow = {name, object, success}
					let uniqueId = Date.now() + '' + Math.random()
					let assertedQueue = await this.channel.assertQueue('', {exclusive: true})
					let queueName = assertedQueue.queue
					
					let redelivery = this._redeliveryOnFail(false)
					this.channel.consume(queueName, this._onAnswer(resend || success, uniqueId), redelivery)
					
					let lookbackAddress = this._getLoopbackAddress(queueName, uniqueId)
					let devOrNotName = this._devOrNotName(name)
					await this._getQueue(devOrNotName)
					this.channel.sendToQueue(devOrNotName, this._getBuffer(object), lookbackAddress)
				}
			} catch(error) {
				this.Errors(this.label, 'send catch', error)
			}
		}).catch(error => {
			this.Errors(this.label, 'send', error)
		})
	}
	
	async sendToAll(label, object) {
		try {
			if (label) {
				let queueName = this.sendToAll.name + label
				let channel = await this.connection.createChannel()
				await channel.assertExchange(queueName, 'fanout', {durable: false})
				channel.publish(queueName, '', this._getBuffer(object || {}))
			}
		} catch(error) {
			this.Errors(this.label, 'sendToAll', error)
		}
	}
	
	async subscribe(callback, name) {
		try {
			if (typeof callback === 'function') {
				if (!name) {
					name = callback.name.replace(/^bound /, '')
				}
				let exchangeQueueName = this.sendToAll.name + name
				let channel = await this.connection.createChannel()
				await channel.assertExchange(exchangeQueueName, 'fanout', {durable: false})
				let anotherQueue = await channel.assertQueue('', {exclusive: true})
				let anotherQueueName = anotherQueue.queue
				channel.bindQueue(anotherQueueName, exchangeQueueName, '')
				channel.consume(anotherQueueName, this._onAnswer(callback), this._redeliveryOnFail(false))
			}
		} catch(error) {
			this.Errors(this.label, 'subscribe', error)
		}
	}
	
	_onAnswer(success, uniqueId) {
		if (typeof success === 'function') {
			return (msg) => {
				if (!uniqueId || msg.properties.correlationId === uniqueId) {
					let string = msg.content.toString()
					let object = JSON.parse(string)
					success(object)
				}
			}
		}
	}
	
	async _connection() {
		try {
			let hostName = this._devOrNotName('rabbitmq')
			this.connection = await this.amqplib.connect('amqp://' + hostName)
			this.channel = await this.connection.createChannel()
			await this._receive()
		} catch(error) {
			this.Errors(this.label, '_connection', error)
		}
	}
	
	async _receive(name) {
		try {
			if (!name) {
				name = this.name
			}
			await this._getQueue(name)
			this.channel.prefetch(1)
			this.channel.consume(name, (msg) => {
				let string = msg.content.toString()
				let object = JSON.parse(string)
				this.callback(object, this._onDone(msg))
			})
		} catch(error) {
			this.Errors(this.label, '_receive', error)
		}
	}
	
	_onDone(msg) {
		return (object) => {
			let replyTo = msg.properties.replyTo
			let buffer = this._getBuffer(object || {})
			let uniqueOption = {
				correlationId: msg.properties.correlationId
			}
			this.channel.sendToQueue(replyTo, buffer, uniqueOption)
			this.channel.ack(msg)
		}
	}
	
	async _getQueue(name) {
		try {
			let queue = false
			if (!this._queues) {
				this._queues = {}
			}
			if (!this._queues[name]) {
				queue = await this.channel.assertQueue(name, 'fanout', { durable: false })
				this._queues[name] = queue
			} else {
				queue = this._queues[name]
			}
			return queue
		} catch(error) {
			this.Errors(this.label, '_getQueue', error)
		}
	}
	
	_closeBeforeExit() {
		process.once('exit', () => {
			this.connection.close()
		})
	}
	
	_redeliveryOnFail(redelivery) {
		return {
			noAck: !redelivery
		}
	}
	
	_getLoopbackAddress(queueName, uniqueId) {
		return {
			replyTo: queueName,
			correlationId: uniqueId
		}
	}
	
	_getBuffer(object) {
		let string = JSON.stringify(object)
		return Buffer.from(string)
	}
	
	_devOrNotName(name) {
		if (process.env.STAGE === 'development' && name) {
			let regexp = new RegExp('^' + process.env.PREFIX)
			let notDevName = name.replace(regexp, '')
			name = process.env.PREFIX + notDevName
		}
		return name
	}
	
	_resend(name, object, success) {
		setTimeout(() => {
			if (!this.connection.fail) {
				this.send(name, object, success)
			} else {
				this._resend(name, object, success)
			}
		}, Settings.rabbitMqTimeout)
	}
	
	_onError() {
		process.on('uncaughtException', (error, origin) => {
			if (!this._notAnError(error)) {
				this.Errors(this.label, 'uncaughtException', {
					errorString: error.toString(),
					errorJSON: JSON.stringify(error),
					origin
				})
			}
		})
		process.on('unhandledRejection', (error, promise) => {
			if (!this._notAnError(error)) {
				if (error && typeof error === 'object' && error.message === 'Channel closed') {
					this.connection.fail = true
					if (this._sendNow && this._sendNow.name) {
						this._resend(this._sendNow.name, this._sendNow.object, this._sendNow.success)
					}
					this._queues = {}
					setTimeout(() => {
						this._connection()
					}, Settings.rabbitMqTimeout)
				} else {
					this.Errors(this.label, 'unhandledRejection', error)
				}
			}
		})
	}
	
	_notAnError(error) {
		let notAnError = false
		if (error && typeof error === 'object') {
			if (['ECONNREFUSED', 'EAI_AGAIN', 'ECONNRESET', 406].includes(error.code)) {
				notAnError = true
			}
		}
		return notAnError
	}
}

module.exports = RabbitMQ