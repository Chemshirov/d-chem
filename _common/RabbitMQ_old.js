const fs = require('fs')
const Settings = require('./Settings.js')
const Amqplib = require('amqplib')

class RabbitMQ {
	constructor(onError, callback, name, log) {
		this.onError = onError
		this.callback = callback
		this.name = name || process.env.HOSTNAME
		this.log = log
		this.label = this.constructor.name
	}
	
	connect(hostName) {
		return new Promise(async success => {
			this._tryToConnect(hostName, success)
			if (this._connectionSI) {
				clearInterval(this._connectionSI)
			}
			this._connectionSI = setInterval(() => {
				this._tryToConnect(hostName, success)
			}, Settings.rabbitMqTimeout)
		}).catch(error => {
			this._sendError('connect', error)
		})
	}
	
	end() {
		if (this.connection) {
			this.connection.close()
		}
	}
	
	setAnotherRabbitMQ(currentHost, remoteHost) {
		return new Promise(async success => {
			try {
				setTimeout(() => {
					success()
				}, Settings.standardTimeout)
				await this._setAnotherRabbitMQ(remoteHost)
				await this.subscribe(this._reconnectAnotherRabbit.bind(this), 'reconnectAnotherRabbit')
				this.anotherRabbitMQ.sendToAll('reconnectAnotherRabbit', { remoteHost: currentHost })
				success()
			} catch(error) {
				this._sendError('setAnotherRabbitMQ catch', error)
			}
		}).catch(error => {
			this._sendError('setAnotherRabbitMQ', error)
		})
	}
	
	async setAnotherChannel(name) {
		try {
			if (!this.anotherChannelList) {
				this.anotherChannelList = {}
			}
			this.anotherChannelList[name] = true
			await this._receive(this._devOrNotName(name))
		} catch(error) {
			this._sendError('setAnotherChannel', error)
		}
	}
	
	send(name, object, resend) {
		return new Promise(async success => {
			try {
				if (this.channel) {
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
				this._sendError('send catch', error)
			}
		}).catch(error => {
			this._sendError('send', error)
		})
	}
	
	async sendToAll(label, object) {
		try {
			if (label && this.channel) {
				let queueName = this.sendToAll.name + label
				await this.channel.assertExchange(queueName, 'fanout', {durable: false})
				let options = { expiration: Settings.rabbitMqTimeout }
				this.channel.publish(queueName, '', this._getBuffer(object || {}), options)
			}
		} catch(error) {
			this._sendError('sendToAll', error)
		}
	}
	
	async subscribe(callback, name, resubscribe) {
		try {
			if (typeof callback === 'function' && this.channel) {
				if (!name) {
					name = callback.name.replace(/^bound /, '')
				}
				if (!resubscribe) {
					if (!this.subscribeList) {
						this.subscribeList = {}
					}
					this.subscribeList[name] = callback
				}
				let exchangeQueueName = this.sendToAll.name + name
				await this.channel.assertExchange(exchangeQueueName, 'fanout', {durable: false})
				let anotherQueue = await this.channel.assertQueue('', {exclusive: true})
				let anotherQueueName = anotherQueue.queue
				this.channel.bindQueue(anotherQueueName, exchangeQueueName, '')
				this.channel.consume(anotherQueueName, this._onAnswer(callback), this._redeliveryOnFail(false))
			}
		} catch(error) {
			this._sendError('subscribe', error)
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
	
	async _tryToConnect(hostName, success) {
		try {
			if (!this.connected) {
				this.end()
				await this._connection(hostName)
			}
			if (this.connected) {
				if (this._connectionSI) {
					clearInterval(this._connectionSI)
				}
				success(this)
			}
		} catch(error) {
			this._sendError('_tryToConnect', error)
		}
	}
	
	async _connection(hostName) {
		try {
			if (!hostName) {
				hostName = this._devOrNotName(this.label.toLowerCase())
			}
			let port = Settings.rabbitMqDefaultPort
			let password = await this._getPassword()
			let user = this.label.toLowerCase()
			let isHostExternal = hostName.split('.').length >= 2
			if (isHostExternal) {
				port = Settings.rabbitMqPort
			}
			let url = 'amqp://' + user + ':' + password + '@' + hostName + ':' + port
			this.connection = await Amqplib.connect(url)
			if (this.connection) {
				this._onConnection(hostName)
			}
		} catch(error) {
			this._sendError('_connection', error)
		}
	}
	
	async _onConnection(hostName) {
		try {
			this.connection.on('error', error => {
				this.connected = false
			})
			this.connection.on('close', () => {
				this.connected = false
			})
			this.channel = await this.connection.createChannel()
			if (this.channel) {
				await this._receive()
				this.connected = true
			}
		} catch(error) {
			this._sendError('_onConnection', error)
		}
	}
	
	// _reconnection(hostName, close, error) {
		// if (!this._reconnecting && this.channel) {
			// this._reconnecting = true
			// this.connected = false
			// this._closed = true
			// this.connection.close()
			// this.connection = false
			// this.channel = false
			// setTimeout(() => {
				// this.connect(hostName)
			// }, Settings.standardTimeout * 3)
		// }
	// }
	
	_getPassword() {
		return new Promise(success => {
			let rabbitmq = this.label.toLowerCase()
			let path = '/usr/nodejs/sda/' + process.env.STAGE + '/' + rabbitmq + '/'+ rabbitmq +'.conf'
			fs.readFile(path, (error, result) => {
				if (error) {
					this._sendError('getPassword readFile', error)
				} else {
					let password = result.toString().trim().replace(/[\n\r]/gi, '')
					success(password)
				}
			})
		}).catch(error => {
			this._sendError('_getPassword', error)
		})
	}
	
	async _receive(name) {
		try {
			if (!name) {
				name = this.name
			}
			await this._getQueue(name)
			this.channel.prefetch(1)
			this.channel.consume(name, msg => {
				let string = msg.content.toString()
				let object = JSON.parse(string)
				if (this.callback) {
					this.callback(object, this._onDone(msg))
				} else {
					this._onDone(msg)()
				}
			})
		} catch(error) {
			this._sendError('_receive', error)
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
				if (this.channel) {
					queue = await this.channel.assertQueue(name, 'fanout', { durable: false })
					this._queues[name] = queue
				}
			} else {
				queue = this._queues[name]
			}
			return queue
		} catch(error) {
			this._sendError('_getQueue', error)
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
		if (typeof object.error === 'object') {
			let newErrorObject = {}
			let properties = Object.getOwnPropertyNames(object.error)
			properties.forEach(property => {
				newErrorObject[property] = object.error[property]
			})
			object.error = newErrorObject
		}
		let string = JSON.stringify(object)
		return Buffer.from(string)
	}
	
	_devOrNotName(name) {
		if (name) {
			let withPrefix = (/^[a-z]\-/).test(name)
			if (!withPrefix) {
				name = process.env.PREFIX + name
			}
		}
		return name
	}
	
	async _setAnotherRabbitMQ(remoteHost) {
		try {
			let onError = this.onError.bind(this)
			let sendError = this._sendError.bind(this)
			let log = this.log.bind(this)
			let another = new AnotherRabbitMQ(onError, sendError, log, remoteHost)
			this.anotherRabbitMQ = await another.getAnotherRabbitMQ()
			this.log({anotherRabbitMQ: 'is connected', remoteHost: remoteHost})
		} catch(error) {
			this._sendError('_setAnotherRabbitMQ', error)
		}
	}
	
	async _reconnectAnotherRabbit(object) {
		try {
			this.log('_reconnectAnotherRabbit to', object.remoteHost)
			await this._setAnotherRabbitMQ(object.remoteHost)
		} catch(error) {
			this._sendError('_reconnectAnotherRabbit', error)
		}
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
	
	_sendError(method, error) {
		this.onError(this.label, process.env.HOSTNAME + ': ' + method, error)
	}
}

class AnotherRabbitMQ {
	constructor(onError, sendError, log, host) {
		this.onError = onError
		this.sendError = sendError
		this.log = log
		this.host = host
		this.label = this.constructor.name
	}
	
	async getAnotherRabbitMQ() {
		try {
			let onErrorFunction = this.onError.bind(this)
			let logFunction = this.log.bind(this)
			let rabbitMQ = new RabbitMQ(onErrorFunction, false, false, logFunction)
			let anotherRabbitMQ = await rabbitMQ.connect(this.host)
			return anotherRabbitMQ
		} catch(error) {
			this.sendError(this.label + '_start', error)
		}
	}
}

module.exports = RabbitMQ