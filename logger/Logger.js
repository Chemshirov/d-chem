const fs = require('fs')
const Redis = require('../_common/Redis.js')
const Settings = require('../_common/Settings.js')
const Starter = require('../_common/Starter.js')

class Logger extends Starter {
	constructor() {
		super()
		this.label = this.constructor.name
		this.typesKey = this.label + ':types'
		this._queue = {}
	}
	
	async atStart() {
		try {
			let redis = new Redis(this.onError.bind(this))
			this.redis = await redis.connect()
			this._handler()
			await this._cleanRedis(true)
		} catch(err) {
			this.onError(this.label, 'atStart', err)
		}
	}
	
	onRabbitMqReceives(object, onDone) {
		this._addToQueue(object)
		console.log(this._getDate(), object)
		onDone(true)
	}
	
	_handler() {
		setInterval(async () => {
			try {
				let array = Object.keys(this._queue)
				if (array.length) {
					let text = JSON.stringify(this._queue, null, 2)
					fs.appendFile(process.env.TILDA + process.env.AFTER_TILDA + 'log.log', text, (err) => {
						if (err) {
							console.log(err)
						}
					})
				}
				for (let i = 0; i < array.length; i++) {
					let date = array[i]
					await this._sendToRedis(date)
					delete this._queue[date]
				}
				await this._cleanRedis()
			} catch(err) {
				this.onError(this.label, '_handler', err)
			}
		}, Settings.loggerInterval)
	}
	
	async _sendToRedis(date) {
		try {
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
				await pipeline.exec()
			}
		} catch(err) {
			this.onError(this.label, '_sendToRedis', err)
		}
	}
	
	async _cleanRedis(force) {
		try {
			let pipeline = this.redis.pipeline()
			let someTime = (Math.random() < (1 / Settings.loggerLimit))
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
				await pipeline.exec()
			}
		} catch(err) {
			this.onError(this.label, '_cleanRedis', err)
		}
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
		if (!this.hrTimeShift) {
			this._setDate()
		}
		let currentDate = process.hrtime.bigint() + this.hrTimeShift
		let currentDateString = currentDate.toString()
		let hrExtraTime = currentDateString.slice(currentDateString.length - 6)
		
		let timeZoneShift = Settings.timeZone * 60 * 60 * 1000
		let tzDate = Number(currentDate / BigInt(1e6) + BigInt(timeZoneShift))
		let date = new Date(tzDate).toJSON().replace(/T/, ' ').replace(/Z/, '')
		
		let hrDate = date + hrExtraTime
		return hrDate
	}
}

module.exports = Logger