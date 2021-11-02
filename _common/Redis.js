const fs = require('fs')
const redis = require('redis')
const Settings = require('./Settings.js')

class Redis {
	constructor(onError, host, port) {
		this.onError = onError
		this.host = host
		this.port = port
		this.label = this.constructor.name
		
		this.subscribes = {}
		this._initiate()
	}
	
	_initiate() {
		if (!this.host) {
			this.host = process.env.PREFIX + 'redis'
			this.port = Settings.redisDefaultPort
		}
		if (!this.port) {
			let stage = Settings.stageByContainerName(this.host)
			this.port = Settings.redisPortByStage(stage)
		}
		let functionsList = this._getFunctionsList()
		functionsList.push('pipe')
		functionsList.push('publish')
		functionsList.forEach(functionName => {
			this[functionName] = this._redisFunction.bind(this, functionName)
		})
	}
	
	async subscribe(channelName, callback) {
		try {
			this.subscribes[channelName] = callback
			await this._subscribe()
		} catch (error) {
			this.onError(this.label, 'subscribe', error)
		}
	}
	
	async _redisFunction(functionName, ...args) {
		try {
			await this._getAsyncRedisClient()
			if (this._asyncRedisClient && this._asyncRedisClient[functionName]) {
				if (functionName === 'pipe') {
					await this._asyncRedisClient[functionName](args[0], args[1])
				} else {
					let results = await this._asyncRedisClient[functionName](args)
					return results
				}
			} else {
				return false
			}
		} catch (error) {
			let methodName = '_redisFunction, functionName:' + functionName + ', args: ' + args
			this.onError(this.label, methodName, error)
		}
	}
	
	async _getAsyncRedisClient() {
		try {
			if (!this._asyncRedisClient) {
				await this._connect()
			}
		} catch (error) {
			this.onError(this.label, '_getAsyncRedisClient', error)
		}
	}
	
	_connect() {
		return new Promise(async success => {
			if (!this._tryToConnect) {
				this._tryToConnect = true
				setTimeout(() => {
					this._tryToConnect = false
					success()
				}, Settings.standardTimeout)
				try {
					let password = await this._getPassword()
					let options = { host: this.host, port: this.port, password }
						options.detect_buffers = true
						options.enable_offline_queue = false
					let redisClient = redis.createClient(options)
					redisClient.on('error', error => {
						this._asyncRedisClient = false
					})
					redisClient.on('ready', error => {
						this._asyncRedisClient = this._asyncRedis(redisClient)
						success()
					})
				} catch(error) {
					this.onError(this.label, '_connect', error)
					this._asyncRedisClient = false
				}
			} else {
				setTimeout(() => {
					success()
				}, Settings.standardTimeout)
			}
		}).catch(error => {
			this.onError(this.label, '_connect Promise', error)
		})
	}
	
	_getPassword() {
		return new Promise(success => {
			fs.readFile('/usr/nodejs/sda/' + process.env.STAGE + '/redis/redis.conf', (error, result) => {
				if (error) {
					this.onError(this.label, 'getPassword readFile', error)
				} else {
					let confString = result.toString().trim().replace(/[\n\r]+/g, ' ')
					let password = confString.replace(/^(.+)?requirepass ([^ ]+)(.+)?$/g, '$2')
					success(password)
				}
			})
		}).catch(error => {
			this.onError(this.label, '_getPassword', error)
		})
	}
	
	_asyncRedis(redisClient) {
		let handler = {
			apply: (target, thisArg, argumentsList) => {
				return new Promise(success => {
					if (argumentsList.length) {
						if (this._asyncRedisClient) {
							argumentsList.push(this._redisCallback.bind(this, target.name, success))
						} else {
							success(false)
						}
					}
					Reflect.apply(target, thisArg, argumentsList)
				}).catch(error => {
					this.onError(this.label, '_asyncRedis apply ' + target.name, error)
				})
			}
		}
		let functionsList = this._getFunctionsList()
		functionsList.forEach(functionName => {
			redisClient[functionName] = new Proxy(redisClient[functionName], handler)
		})
		redisClient.pipe = this._pipe.bind(this, redisClient)
		return redisClient
	}
	
	_pipe(redisClient, list, isTransaction) {
		if (this._asyncRedisClient) {
			return new Promise(success => {
				if (!isTransaction) {
					redisClient.batch(list).exec((error, replies) => {
						if (error) {
							this.onError(this.label, '_pipe batch', error)
							success(false)
						} else {
							success(replies)
						}
					})
				}
			}).catch(error => {
				this.onError(this.label, '_pipe', error)
			})
		} else {
			return false
		}
	}
	
	_redisCallback(name, success, error, result) {
		if (error) {
			this._asyncRedisClient = false
			this.onError(this.label, '_redisCallback , container: ' + process.env.NAME, error)
			success(false)
		} else {
			success(result)
		}
	}
	
	_getFunctionsList() {
		let hashes = ['hdel', 'hget', 'hgetall', 'hincrby', 'hmset', 'hset']
		let lists = ['lpush', 'lrange', 'ltrim']
		let sets = ['sadd', 'scard', 'smembers', 'srandmember', 'srem']
		let strings = ['get', 'set']
		let commons = ['expire']
		let functionsList = [...hashes, ...lists, ...sets, ...strings, ...commons]
		return functionsList
	}
	
	async _subscribe() {
		try {
			await this._getAsyncRedisClient()
			if (this._asyncRedisClient) {
				Object.keys(this.subscribes).forEach(channelName => {
					if (!this._asyncRedisClient.subscribes) {
						this._asyncRedisClient.subscribes = {}
					}
					if (!this._asyncRedisClient.subscribes[channelName]) {
						this._asyncRedisClient.on('subscribe', (channel, count) => {
							this._asyncRedisClient.subscribes[channelName] = true
						})
						this._asyncRedisClient.on('message', (channel, message) => {
							let callback = this.subscribes[channelName]
							if (typeof callback === 'function') {
								callback(channel, message)
							}
						})
						this._asyncRedisClient.subscribe(channelName)
					}
				})
			}
		} catch (error) {
			this.onError(this.label, '_subscribe', error)
		}
	}
}

module.exports = Redis