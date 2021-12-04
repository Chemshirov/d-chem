const Amqplib = require('amqplib')
const fs = require('fs')
const Settings = require('./Settings.js')

class RabbitMQextension {
	constructor(onError, log) {
		this.onError = (label, method, error) => {
			onError(label, method, error)
		}
		let emptyLogFunction = () => {}
		this.log = log || emptyLogFunction
		this._connections = {}
		this._channels = {}
		this._receives = {}
		this.reReceive = false
		this.getNewConnection = false
	}
	
	setRabbitHostName(hostName) {
		this.rabbitHostName = hostName
	}
	
	setDefaultQueueName(name) {
		this.defaultQueueName = name
	}
	
	reconnect(options) {
		return new Promise(success => {
			setTimeout(async () => {
				try {
					let uniqueId = this._getQueueUniqueId(options)
					delete this._connections[uniqueId]
					await this._getConnection(options)
					success()
				} catch (error) {
					this.onError(this.label, 'reconnect catch', error)
				}
			}, Settings.standardTimeout)
		}).catch(error => {
			this.onError(this.label, 'reconnect', error)
		})
	}
	
	getChannel(options) {
		return new Promise(async success => {
			let getChannelSuccess = false
			setTimeout(() => {
				if (!getChannelSuccess) {
					this.getNewConnection = true
					success(false)
				}
			}, Settings.rabbitMqTimeout)
			if (options.label || this.defaultQueueName) {
				try {
					let uniqueId = this._getQueueUniqueId(options)
					if (!this._channels[uniqueId] || options.getNewConnection || this.getNewConnection) {
						this._channels[uniqueId] = await this._getChannel(options)
					}
					if (this._channels[uniqueId] && !this._channels[uniqueId].isClosed) {
						getChannelSuccess = true
						this.getNewConnection = false
						success(this._channels[uniqueId])
					} else {
						this.getNewConnection = true
					}
				} catch(error) {
					this.onError(this.label, 'getChannel 2', error)
				}
			}
		}).catch(error => {
			this.onError(this.label, 'getChannel', error)
		})
	}
	
	getObjectFromMessage(message) {
		if (message.content) {
			try {
				let string = message.content.toString()
				let framedMessage = JSON.parse(string)
				let object = framedMessage.message
				if (Date.now() - framedMessage.sentDate < Settings.rabbitMqTimeout) {
					return object
				}
			} catch(error) {
				this.onError(this.label, 'getObjectFromMessage', error)
			}
		}
	}
	
	getFramedBuffer(message) {
		let framedMessage = {}
			framedMessage.message = message
			framedMessage.sentDate = Date.now()
		let buffer = this._getBuffer(framedMessage)
		return buffer
	}
	
	addToReceives(options) {
		if (options) {
			let optionString = JSON.stringify(options)
			this._receives[optionString] = options
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
	
	async _getChannel(options) {
		try {
			let channel = false
			let connection = await this._getConnection(options)
			if (connection) {
				channel = await connection.createChannel().catch(error => {
					this.onError(this.label, 'getChannel createChannel', error)
				})
				channel.on('error', error => {
					channel.isClosed = error
					this.getNewConnection = true
					this.onError(this.label, '_getChannel channel.on error', error)
				})
				channel.on('close', () => {
					this.getNewConnection = true
					channel.isClosed = 'Channel close event has been chatched'
				})
			}
			return channel
		} catch(error) {
			this.onError(this.label, '_getChannel', error)
		}
	}
	
	async _getConnection(options) {
		try {
			let uniqueId = this._getQueueUniqueId(options)
			if (!this._connections[uniqueId] || options.getNewConnection || this.getNewConnection) {
				let connector = new RabbitMQconnector(this.onError, this.log, this.rabbitHostName)
				if (this._connectionST) {
					clearTimeout(this._connectionST)
				}
				this._connectionST = setTimeout(() => {
					this.reReceive = true
				}, Settings.standardTimeout)
				this._connections[uniqueId] = await connector.establish(options)
				clearTimeout(this._connectionST)
				if (this.reReceive || this.getNewConnection) {
					this.reReceive = false
					this.getNewConnection = false
					Object.keys(this._receives).forEach(key => {
						let options = this._receives[key]
						this.receive(options)
					})
				}
			}
			return this._connections[uniqueId]
		} catch(error) {
			this.onError(this.label, '_getConnection', error)
		}
	}
	
	_getQueueUniqueId(options) {
		let rabbitHostName = options.rabbitHostName || this.rabbitHostName
		let rabbitPort = options.port || ''
		let queueName = options.label || this.defaultQueueName
		let uniqueId = rabbitHostName + '_' + rabbitPort + '_' + queueName
		return uniqueId
	}
}

class RabbitMQconnector {
	constructor(onError, log, rabbitHostName) {
		this.onError = onError
		this.log = log
		this.rabbitHostName = rabbitHostName
		this.label = this.constructor.name
		this.commonLabel = this.label.substring(0, 8).toLowerCase()
		this._connectionIntervals = {}
	}
	
	async establish(options) {
		try {
			let { hostName, port } = this._getHostnameAndPort(options)
			await this._connect(hostName, port)
			if (this._connected) {
				return this._connection
			}
		} catch(error) {
			this.onError(this.label, 'establish', error)
		}
	}
	
	_getHostnameAndPort(options) {
		let prefix = options.prefix
		if (!prefix) {
			prefix = process.env.PREFIX
		}
		if (!prefix) {
			prefix = 'd-'
		}
		
		let hostName = options.rabbitHostName
		if (!hostName) {
			hostName = this.rabbitHostName
			if (!hostName) {
				hostName = prefix + this.commonLabel
			}
		}
		
		let port = options.port
		if (!options.port) {
			port = Settings.rabbitMqDefaultPort
			let isHostExternal = hostName.split('.').length >= 2
			if (isHostExternal) {
				port = Settings.rabbitMqPort
			}
		}
		return { hostName, port }
	}
	
	_connect(hostName, port) {
		return new Promise(success => {
			if (this._connection && this._connected) {
				success()
			} else {
				this._tryToConnect(hostName, port, success)
				if (this._connectionIntervals[hostName + port]) {
					clearInterval(this._connectionIntervals[hostName + port])
				}
				this._connectionIntervals[hostName + port] = setInterval(() => {
					this._tryToConnect(hostName, port, success)
				}, Settings.rabbitMqTimeout)
			}
		}).catch(error => {
			this.onError(this.label, 'connect', error)
		})
	}
	
	async _tryToConnect(hostName, port, success) {
		try {
			if (!this._connected) {
				if (this._connection) {
					this._connection.close()
				}
				await this._setConnection(hostName, port)
			}
			if (this._connected) {
				if (this._connectionIntervals[hostName + port]) {
					clearInterval(this._connectionIntervals[hostName + port])
				}
				success()
			}
		} catch(error) {
			this.onError(this.label, '_tryToConnect', error)
		}
	}
	
	async _setConnection(hostName, port) {
		try {
			let user = this.commonLabel
			let password = await this._getPassword()
			let url = 'amqp://' + user + ':' + password + '@' + hostName + ':' + port
			this._connection = await Amqplib.connect(url)
			if (this._connection) {
				this._connected = true
				this._connectionEventsHandler()
			}
		} catch(error) {
			this.onError(this.label, '_setConnection', error)
		}
	}
	
	_connectionEventsHandler() {
		this._connection.on('error', error => {
			this._connected = false
		})
		this._connection.on('close', () => {
			this._connected = false
		})
	}
	
	_getPassword() {
		return new Promise(success => {
			let rabbitmq = this.commonLabel
			let path = '/usr/nodejs/sda/' + Settings.stage + '/' + rabbitmq + '/' + rabbitmq +'.conf'
			fs.readFile(path, (error, result) => {
				if (error) {
					this.onError(this.label, 'getPassword readFile', error)
				} else {
					let password = result.toString().trim().replace(/[\n\r]/gi, '')
					success(password)
				}
			})
		}).catch(error => {
			this.onError(this.label, '_getPassword', error)
		})
	}
}

module.exports = RabbitMQextension