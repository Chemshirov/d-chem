const fs = require('fs')
const redis = require('redis')
const Settings = require('./Settings.js')
const errorsPath = '/usr/nodejs/sda/' + process.env.STAGE + '/redis/redis.errors'

class Redis {
	constructor(onError) {
		this._onError = onError
		this.label = this.constructor.name
	}
	
	async connect(host, isSecondary) {
		this.isSecondary = isSecondary
		try {
			let redis = await this._getRedis(host)
			return redis
		} catch(error) {
			this._onError(this.label, 'connect', error)
		}
	}
	
	setSubscribeFunction(channelName, callback) {
		return new Promise(async success => {
			try {
				let redis = await this._getRedis()
				if (redis) {
					redis.on('subscribe', (channel, count) => {
						success()
					})
					redis.on('message', (channel, message) => {
						if (typeof callback === 'function') {
							callback(channel, message)
						}
					})
					redis.subscribe(channelName)
				}
			} catch(error) {
				this._onError(this.label, 'setSubscribeFunction catch', error)
			}
		}).catch(error => {
			this._onError(this.label, 'setSubscribeFunction', error)
		})
	}
	
	_getRedis(host) {
		return new Promise(async success => {
			try {
				let defaultHost = process.env.PREFIX + 'redis'
				let port = Settings.redisPort
				if (!host || host === defaultHost) {
					host = defaultHost
					port = Settings.redisDefaultPort
				} else if (host && host.charAt(1) === '-') {
					port = Settings.redisDefaultPort
				} else {
					let stage = Settings.stageByContainerName(host)
					port = Settings.redisPortByStage(stage)
				}
				let password = await this._getPassword()
				let options = { host, port, password }
					options.detect_buffers = true
					options.enable_offline_queue = false
				let redisClient = redis.createClient(options)
				redisClient.on('error', error => {
					this._handleErrors('_getRedis createClient', error)
				})
				if (this._getRedisST) {
					clearTimeout(this._getRedisST)
				}
				this._getRedisST = setTimeout(() => {
					success(false)
				}, Settings.redisTimeout)
				redisClient.on('ready', error => {
					let asyncRedisClient = this._asyncRedis(redisClient)
					clearTimeout(this._getRedisST)
					success(asyncRedisClient)
				})
			} catch(error) {
				this._handleErrors('_getRedis', error)
			}
		}).catch(error => {
			this._onError(this.label, '_getRedis', error)
		})
	}
	
	_getPassword() {
		return new Promise(success => {
			fs.readFile('/usr/nodejs/sda/' + process.env.STAGE + '/redis/redis.conf', (error, result) => {
				if (error) {
					this._onError(this.label, 'getPassword readFile', error)
				} else {
					let confString = result.toString().trim().replace(/[\n\r]+/g, ' ')
					let password = confString.replace(/^(.+)?requirepass ([^ ]+)(.+)?$/g, '$2')
					success(password)
				}
			})
		}).catch(error => {
			this._onError(this.label, '_getPassword', error)
		})
	}
	
	_asyncRedis(redisClient) {
		let handler = {
			apply: (target, thisArg, argumentsList) => {
				return new Promise(success => {
					if (argumentsList.length) {
						argumentsList.push(this._redisCallback.bind(this, target.name, success))
					}
					Reflect.apply(target, thisArg, argumentsList)
				}).catch(error => {
					this._onError(this.label, '_asyncRedis apply ' + target.name, error)
				})
			}
		}
		let functionList = ['hdel', 'hget', 'hgetall', 'hincrby', 'hmset', 'hset']
		functionList = functionList.concat(['expire'])
		functionList = functionList.concat(['lrange'])
		functionList = functionList.concat(['sadd', 'scard', 'smembers', 'srandmember', 'srem'])
		functionList = functionList.concat(['get', 'set'])
		functionList.forEach(functionName => {
			let proxyFunction = new Proxy(redisClient[functionName], handler)
			redisClient[functionName] = proxyFunction
		})
		redisClient.pipe = this._pipe.bind(this, redisClient)
		return redisClient
	}
	
	_pipe(redisClient, list, isTransaction) {
		return new Promise(success => {
			if (!isTransaction) {
				redisClient.batch(list).exec((error, replies) => {
					if (error) {
						this._onError(this.label, '_pipe batch', error)
					} else {
						success(replies)
					}
				})
			}
		}).catch(error => {
			this._onError(this.label, '_pipe', error)
		})
	}
	
	_redisCallback(name, success, error, result) {
		if (error) {
			this._handleErrors('_redisCallback', error)
		} else {
			success(result)
		}
	}
	
	_handleErrors(method, error) {
		try {
			this._onError(this.label, '_handleErrors ' + method + ', container: ' + process.env.NAME, error)
			let errorString = `\n ${new Date().toLocaleString()}, ${process.env.NAME}, ${method}, ${error.toString()}`
			fs.appendFileSync(errorsPath, errorString)
		} catch (err) {}
	}
}

module.exports = Redis