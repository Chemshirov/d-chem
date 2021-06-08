const RabbitMQ = require('../_common/RabbitMQ.js')
const Redis = require('ioredis')
const Settings = require('../_common/Settings.js')
const Statistics = require('../_common/Statistics.js')

class Logger {
	constructor() {
		this.label = this.constructor.name
		this.typesKey = this.label + ':types'
		
		this.rabbitMQ = new RabbitMQ(this._onError.bind(this), this._rabbitMQreceive.bind(this))
		this.redis = new Redis({ host: process.env.PREFIX + 'redis' })
		this.statistics = new Statistics(this._onError.bind(this), this.rabbitMQ)
		
		this._queue = {}
		
		this._start()
	}
	
	_start() {
		this.rabbitMQ.connect().then(async () => {
			try {
				this._setDate()
				this._handler()
				await this._cleanRedis(true)
				this.statistics.started()
			} catch(err) {
				this._onError(this.label, 'start', err)
			}
		})
	}
	
	_handler() {
		setInterval(async () => {
			try {
				let array = Object.keys(this._queue)
				for (let i = 0; i < array.length; i++) {
					let date = array[i]
					await this._sendToRedis(date)
					delete this._queue[date]
				}
			} catch(err) {
				this._onError(this.label, '_handler', err)
			}
		}, Settings.loggerInterval)
	}
	
	_sendToRedis(date) {
		return new Promise(success => {
			let object = this._queue[date]
			if (object) {
				let pipeline = this.redis.pipeline()
				pipeline.sadd(this.typesKey, object.type)
				let lKey = this.label + ':' + object.type
				pipeline.lpush(lKey, date)
				let hKey = this.label + ':' + object.type + ':' + date
				let array = Object.keys(object)
				for (let i = 0; i < array.length; i++) {
					let key = array[i]
					if (key !== 'type') {
						let value = JSON.stringify(object[key])
						pipeline.hset(hKey, key, value)
					}
				}
				pipeline.exec((err, result) => {
					if (!err) {
						success()
					}
				})
				this._cleanRedis()
			}
		}).catch(err => {
			this._onError(this.label, '_sendToRedis', err)
		})
	}
	
	async _cleanRedis(force) {
		try {
			let pipeline = this.redis.pipeline()
			let rough = Settings.loggerLimit / 10
			let someTime = (Math.random() < (1 / rough))
			if (force || someTime) {
				let types = await this.redis.smembers(this.typesKey)
				for (let i = 0; i < types.length; i++) {
					let type = types[i]
					let lKey = this.label + ':' + type
					let tooOld = await this.redis.lrange(lKey, Settings.loggerLimit, -1)
					for (let j = 0; j < tooOld.length; j++) {
						let date = tooOld[j]
						let hKey = this.label + ':' + type + ':' + date
						pipeline.del(hKey)
					}
					pipeline.ltrim(lKey, 0, Settings.loggerLimit)
				}
			}
			pipeline.exec()
			return pipeline
		} catch(err) {
			this._onError(this.label, '_cleanRedis', err)
		}
	}
	
	_rabbitMQreceive(object, onDone) {
		this._addToQueue(object)
		console.log(Date.now(), object)
		onDone(true)
	}
	
	_addToQueue(object) {
		let now = this._getDate()
		this._queue[now] = object
	}
	
	_setDate() {
		let hrNow = BigInt(Date.now() * 1e6)
		let hrDate = process.hrtime.bigint()
		this.hrTimeShift = hrNow - hrDate
	}
	
	_getDate() {
		let currentDate = process.hrtime.bigint() + this.hrTimeShift
		let currentDateString = currentDate.toString()
		let hrExtraTime = currentDateString.slice(currentDateString.length - 6)
		
		let timeZoneShift = Settings.timeZone * 60 * 60 * 1000
		let tzDate = Number(currentDate / BigInt(1e6) + BigInt(timeZoneShift))
		let date = new Date(tzDate).toJSON().replace(/T/, ' ').replace(/Z/, '')
		
		let hrDate = date + hrExtraTime
		return hrDate
	}
	
	_onError(className, method, error) {
		let object = { type: 'error', className, method, error }
		this._addToQueue(object)
	}
}

module.exports = Logger