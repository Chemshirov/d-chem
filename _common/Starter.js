const cluster = require('cluster')
const fs = require('fs')
const Logger = require('./Logger.js')
const RabbitMQ = require('./RabbitMQ.js')
const Redis = require('./Redis.js')
const Settings = require('./Settings.js')

class Starter {
	constructor() {
		this.boundOnError = this.onError.bind(this)
	}
	
	async start() {
		try {
			this._setUnhandledErrorsHandler()
			this.redis = new Redis(this.boundOnError)
			this.logger = new Logger(this.redis)
			await this.logger.initiate()
			this._setLogFunction()
			this.boundLog = this.log.bind(this)
			
			if (cluster.isPrimary) {
				this.log(process.env.HOSTNAME + ' is starting')
			}
			this.rabbitMQ = new RabbitMQ(this.boundOnError, this.boundLog)
			
			if (typeof this.atStart === 'function') {
				this.rabbitMQ.setDefaultQueueName(this.label)
				await this.atStart()
				if (cluster.isPrimary) {
					this._sendStartedMessage()
					this.log(process.env.HOSTNAME + ' has started')
				}
			}
		} catch(err) {
			this.onError(this.label, 'start', err)
		}
	}
	
	onError(className, method, error) {
		if (error && !this._notAnError(error)) {
			if (this.logger) {
				this.logger.writeError(className, method, error)
			}
		}
	}
	
	async getDomainAndIps() {
		try {
			let commonLabel = 'commonInfo'
			this.currentIp = await this.redis.hget(commonLabel, 'currentIp')
			process.env.CURRENT_IP = this.currentIp
			this.anotherIp = await this.redis.hget(commonLabel, 'anotherIp')
			this.domain = await this.redis.hget(commonLabel, 'domain')
			process.env.DOMAIN = this.domain
			this.anotherDomain = await this.redis.hget(commonLabel, 'anotherDomain')
			this.predispositionalMasterIp = await this.redis.hget(commonLabel, 'predispositionalMasterIp')
		} catch(err) {
			this.onError(this.label, 'getDomainAndIps', err)
		}
	}
	
	async isMaster() {
		try {
			let masterIp = await this.redis.hget('Arbiter', 'masterIp')
			return this.currentIp === masterIp
		} catch(error) {
			this.onError(this.label, 'isMaster', error)
		}
	}
	
	_setLogFunction() {
		let logger = this.logger
		this.log = (...args) => {
			this._log(logger, ...args)
		}
	}
	
	_log(logger, ...args) {
		let label = this.label
		let data = args[0]
		if (args.length > 1) {
			let joinedString = ''
			args.forEach(argument => {
				let string = argument + ''
				if (typeof argument === 'object') {
					string = JSON.stringify(argument, false, 4)
				}
				joinedString += (joinedString ? ', ' : '' ) + string
			})
			data = joinedString
		} else {
			if (typeof data === 'object') {
				if (data.label) {
					label = data.label
					delete data.label
					if (data.data) {
						data = data.data
					}
				}
			}
		}
		logger.writeLog(label, data)
	}
	
	_sendStartedMessage() {
		let message = {
			type: 'started',
			startedLabel: this.label,
			host: process.env.HOSTNAME,
			date: process.env.EXTRA
		}
		let rabbitSuffix = '-rabbitmq'
		let sendTo = 'Dockerrun'
		let dRabbitHostName = Settings.developmentStageName.substring(0, 1) + rabbitSuffix
		this.rabbitMQ.send({ rabbitHostName: dRabbitHostName, label: sendTo, message })
		let pRabbitHostName = Settings.productionStageName.substring(0, 1) + rabbitSuffix
		this.rabbitMQ.send({ rabbitHostName: pRabbitHostName, label: sendTo, message })
	}
	
	_setUnhandledErrorsHandler() {
		process.on('unhandledRejection', error => {
			if (error && !this._notAnError(error)) {
				this.onError(this.label, process.env.NAME + ' unhandledRejection', error)
			}
		})
		process.on('uncaughtException', error => {
			if (error && !this._notAnError(error)) {
				this.onError(this.label, process.env.NAME + ' uncaughtException', error)
			}
		})
	}
	
	_notAnError(error) {
		let notAnError = false
		if (error && typeof error === 'object') {
			let errorChunks = ['ECONNREFUSED', 'EAI_AGAIN', 'ECONNRESET', 'EHOSTUNREACH']
				errorChunks = errorChunks.concat(['UNCERTAIN_STATE', 'ETIMEDOUT', 'ENETUNREACH'])
				errorChunks = errorChunks.concat(['TS2307'])
			if (typeof error.code === 'string') {
				errorChunks.some(key => {
					if (error.code.includes(key)) {
						notAnError = true
						return true
					}
				})
			}
			if (!notAnError && typeof error.message === 'string') {
				errorChunks.some(key => {
					if (error.message.includes(key)) {
						notAnError = true
						return true
					}
				})
			}
		}
		return notAnError
	}
}

module.exports = Starter