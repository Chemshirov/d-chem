const fs = require('fs')
const IoRedis = require('ioredis')
const Settings = require('./Settings.js')
const siteSettings = require('/usr/nodejs/sda/' + process.env.STAGE + '/' + Settings.label + '/Settings.js')

class Redis {
	constructor(onError) {
		this._onError = onError
		this.label = this.constructor.name
	}
	
	connect(host, isSecondary) {
		this.host = host
		this.isSecondary = isSecondary
		this._connecting = true
		return new Promise(async onSuccess => {
			try {
				if (!host) {
					host = await siteSettings.getCurrentIp(this._onError)
				}
				this.host = host
				let password = await this._getPassword()
				let options = {
					host: this.host,
					port: Settings.redisPort,
					password,
					lazyConnect: true,
					showFriendlyErrorStack: true
				}
				if (this.isSecondary) {
					options.enableOfflineQueue = false
					options.autoResendUnfulfilledCommands = false
					options.connectTimeout = Settings.connectTimeout
				}
				let redis = await new IoRedis(options)
				redis.on('error', error => {
					if (this.isSecondary) {
						onSuccess()
					} else {
						this._handleErrors(error, true)
					}
				})
				await redis.connect()
				redis.onCatch = this._handleErrors.bind(this)
				onSuccess(redis)
			} catch(error) {
				this._handleErrors(error, true)
			}
		}).catch(error => {
			this._onError(this.label, 'connect', error)
		})
	}
	
	_getPassword() {
		return new Promise(success => {
			fs.readFile('/usr/nodejs/sda/' + process.env.STAGE + '/redis/redis.conf', (error, result) => {
				if (error) {
					this._onError(this.label, 'getPassword readFile', error)
				} else {
					let confString = result.toString().trim().replace(/[\n]+/g, ' ')
					let password = confString.replace(/^.+requirepass ([^ ]+)(.+)?$/g, '$1')
					success(password)
				}
			})
		}).catch(error => {
			this._onError(this.label, 'getPassword', error)
		})
	}
	
	_handleErrors(error) {
		if (!this._notAnError(error)) {
			this._onError(this.label, '_handleErrors', error)
		}
	}
	
	_notAnError(error) {
		let notAnError = false
		if (error && typeof error === 'object') {
			let notErrorArray = ['ECONNREFUSED', 'EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE']
			if (notErrorArray.includes(error.code)) {
				notAnError = true
			} else
			if (error.message === 'Connection is closed.') {
				notAnError = true
			} else
			if (error.name === 'MaxRetriesPerRequestError') {
				notAnError = true
			} else
			if (error.message === 'Stream isn\'t writeable and enableOfflineQueue options is false') {
				notAnError = true
			}
		}
		return notAnError
	}
}

module.exports = Redis