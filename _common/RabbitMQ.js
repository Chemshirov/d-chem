class RabbitMQ {
	constructor(Errors, callback, name) {
		this.Errors = Errors
		this.callback = callback
		
		this.label = this.constructor.name
		this.name = name || process.env.HOSTNAME
		
		this.amqplib = require('amqplib')
		this._onError()
	}
	
	connect() {
		return new Promise(async success => {
			await this._connection()
			success()
		}).catch(error => {
			this.Errors(this.label, 'connect', error)
		})
	}
	
	setAnotherChannel(name) {
		return new Promise(async success => {
			await this._receive(this._devOrNotName(name))
			success()
		}).catch(error => {
			this.Errors(this.label, 'setAnotherChannel', error)
		})
	}
	
	send(name, object, resend) {
		return new Promise(async success => {
			if (object.type === 'error') {
				console.log('Error', object)
			}
			let errorLoop = (name === 'logger' && object.type === 'error' && object.className === 'RabbitMQ')
			if (errorLoop) {
				setTimeout(() => {
					success()
				}, 1000)
			} else {
				this._sendNow = {name, object, success}
				let uniqueId = Date.now() + '' + Math.random()
				let assertedQueue = await this.channel.assertQueue('', {exclusive: true})
				let queueName = assertedQueue.queue
				let lookbackAddress = this._getLoopbackAddress(queueName, uniqueId)
				let devOrNotName = this._devOrNotName(name)
				
				await this._getQueue(devOrNotName)
				this.channel.sendToQueue(devOrNotName, this._getBuffer(object), lookbackAddress)
				
				let acknowledgeMode = this._redeliveryOnFail(true)
				this.channel.consume(queueName, this._onAnswer(uniqueId, resend || success), acknowledgeMode)
			}
		}).catch(error => {
			this.Errors(this.label, 'send', error)
		})
	}
	
	_onAnswer(uniqueId, success) {
		return (msg) => {
			if (msg.properties.correlationId === uniqueId) {
				let string = msg.content.toString()
				let object = JSON.parse(string)
				success(object)
			}
		}
	}
	
	_connection() {
		return new Promise(async success => {
			let hostName = this._devOrNotName('rabbitmq')
			this.connection = await this.amqplib.connect('amqp://' + hostName)
			this.channel = await this.connection.createChannel()
			await this._receive()
			success()
		}).catch(error => {
			this.Errors(this.label, '_connection', error)
		})
	}
	
	_receive(name) {
		if (!name) {
			name = this.name
		}
		return new Promise(async success => {
			await this._getQueue(name)
			this.channel.prefetch(1)
			this.channel.consume(name, (msg) => {
				let string = msg.content.toString()
				let object = JSON.parse(string)
				this.callback(object, this._onDone(msg))
			})
			success()
		}).catch(error => {
			this.Errors(this.label, '_receive', error)
		})
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
	
	_getQueue(name) {
		return new Promise(async success => {
			let queue = false
			if (!this._queues) {
				this._queues = {}
			}
			if (!this._queues[name]) {
				queue = await this.channel.assertQueue(name, 'fanout', {durable: false})
				this._queues[name] = queue
			} else {
				queue = this._queues[name]
			}
			success(queue)
		}).catch(error => {
			this.Errors(this.label, '_getQueue', error)
		})
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
			correlationId: uniqueId,
			persistent: false
		}
	}
	
	_getBuffer(object) {
		let string = JSON.stringify(object)
		return Buffer.from(string)
	}
	
	_devOrNotName(name) {
		if (process.env.STAGE === 'development') {
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
		}, 5000)
	}
	
	_onError() {
		process.on('uncaughtException', (error, origin) => {
			if (!this._notAnError(error)) {
				this.Errors(this.label, 'uncaughtException', error)
			}
		})
		process.on('unhandledRejection', (error, promise) => {
			if (!this._notAnError(error)) {
				if (error && typeof error === 'object' && error.message === 'Channel closed') {
					this.connection.fail = true
					if (this._sendNow) {
						this._resend(this._sendNow.name, this._sendNow.object, this._sendNow.success)
					}
					this._queues = {}
					setTimeout(() => {
						this._connection()
					}, 5000)
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