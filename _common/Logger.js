const fs = require('fs')
const Redis = require('./Redis.js')
const sda = '/usr/nodejs/sda/'
const Settings = require('./Settings.js') 

class Logger {
	constructor() {
		this.label = this.constructor.name
		this.typesKey = this.label + ':types'
		//  tail -f -n 100 /mnt/sda/development/log.log
	}
	
	async initiate() {
		try {
			this.dater = new Dater()
			this.errorThinner = new Thinner(Settings.loggerErrorInterval)
			this.logThinner = new Thinner(Settings.loggerInterval)
			this.fileThinner = new Thinner(Settings.loggerInterval)
			this.filePath = sda + process.env.STAGE + Settings.loggerFileName
			let redis = new Redis(this.writeError.bind(this))
			this.redis = await redis.connect()
		} catch(error) {
			this._internalError('initiate', error)
		}
	}
	
	writeLog(className, data) {
		let object = { className, data }
		object.type = 'logs'
		this._write(object)
	}
	
	writeError(className, method, error) {
		let object = { className, method }
		object.type = 'errors'
		object.error = this._errorToString(error)
		this._write(object, true)
	}
	
	async addToRedis(date, type, string) {
		try {
			let hKey = this.label + ':' + type
			let lKey = hKey + ':list'
			let pipe = []
				pipe.push(['sadd', this.typesKey, type])
				pipe.push(['lpush', lKey, date])
				pipe.push(['hset', hKey, date, string])
			if (this.redis) {
				await this._redisAddCleaner(pipe)
				await this.redis.pipe(pipe)
				await this.redis.publish(this.label, date)
			}
		} catch(error) {
			this._internalError('addToRedis', error)
		}
	}
	
	_write(object, isError) {
		object.hostName = process.env.HOSTNAME
		let now = this.dater.now
		this._fileAddition(object, now)
		let newString = false
		if (isError) {
			newString = this.errorThinner.add(object)
		} else {
			newString = this.logThinner.add(object)
		}
		if (newString) {
			this._echo(object, now)
			this.addToRedis(now, object.type, newString)
		}
	}
	
	_echo(object, now) {
		if (object.error) {
			console.log(object.className, object.method, object.error)
		} else if (typeof object.data === 'string') {
			console.log(object.data)
		} else {
			console.log(now, object)
		}
	}
	
	async _redisAddCleaner(pipe) {
		try {
			let force = false
			if (!this._cleanRedisAtStart) {
				this._cleanRedisAtStart = true
				force = true
			}
			let someTime = (Math.random() < (1 / Settings.loggerLimit))
			if (force || someTime) {
				let types = await this.redis.smembers(this.typesKey)
				for (let i = 0; i < types.length; i++) {
					let type = types[i]
					let lKey = this.label + ':' + type + ':list'
					let tooOld = await this.redis.lrange(lKey, Settings.loggerLimit, -1)
					for (let j = 0; j < tooOld.length; j++) {
						let date = tooOld[j]
						let hKey = this.label + ':' + type
						pipe.push(['hdel', hKey, date])
					}
					pipe.push(['ltrim', lKey, 0, Settings.loggerLimit])
				}
			}
		} catch(error) {
			this._internalError('_redisAddCleaner', error)
		}
	}
	
	_fileAddition(object, date) {
		if (!date) {
			date = this.dater.now
		}
		let string = this.fileThinner.add(object)
		if (string) {
			let shortString = string.substring(0, 512)
			let line = '\n' + date + ': ' + shortString
			fs.appendFile(this.filePath, line, () => {})
		}
	}
	
	_errorToString(error) {
		let notEmptyError = 'Error is empty and has type of ' + typeof error
		if (typeof error === 'object') {
			notEmptyError += ', and properties: ' + Object.getOwnPropertyNames(error).join(', ')
			if (error.message) {
				notEmptyError = {
					message: error.message.toString(),
					stack: error.stack.toString()
				}
			} else 
			if (error.error) {
				error.errorString = JSON.stringify(error.error)
				notEmptyError = error
			} else {
				error.errorString = error.toString()
			}
		} else {
			notEmptyError = error.toString()
		}
		return notEmptyError
	}
	
	_internalError(method, error) {
		let object = { method, error }
		object.className = this.label
		object.error = this._errorToString(object.error)
		this._fileAddition(object)
	}
}

class Dater {
	constructor() {
		this._setDate()
	}
	
	get now() {
		let currentDate = process.hrtime.bigint() + this.hrTimeShift
		let currentDateString = currentDate.toString()
		let hrExtraTime = currentDateString.slice(currentDateString.length - 6)
		
		let timeZoneShift = Settings.timeZone * 60 * 60 * 1000
		let tzDate = Number(currentDate / BigInt(1e6) + BigInt(timeZoneShift))
		let date = new Date(tzDate).toJSON().replace(/T/, ' ').replace(/Z/, '')
		
		let hrDate = date + hrExtraTime
		return hrDate
	}
	
	_setDate() {
		let hrNow = BigInt(Date.now() * 1e6)
		let hrDate = process.hrtime.bigint()
		this.hrTimeShift = hrNow - hrDate
	}
}

class Thinner {
	constructor(timeLimit) {
		this.timeLimit = timeLimit
		this._setBase()
	}
	
	add(object) {
		let newString = false
		let string = JSON.stringify(object)
		
		let lastDate = this.base[string]
		if (!lastDate) {
			newString = string
		} else {
			newString = this._clear(lastDate, string)
		}
		
		let now = Date.now()
		this.base[string] = now
		this.base[now] = string
		this.dates.push(now)
		
		return newString
	}
	
	_clear(lastDate, string) {
		let cleared = false
		let timeSince = Date.now() - lastDate
		if (timeSince > this.timeLimit) {
			delete this.base[string]
			cleared = true
		}
		this._clearByDate()
		if (cleared) {
			return string
		}
	}
	
	_clearByDate() {
		if (this.dates.length) {
			let timeSince = Date.now() - this.dates[0]
			if (timeSince > this.timeLimit) {
				let date = this.dates.shift()
				let string = this.base[date]
				if (string) {
					delete this.base[string]
				}
				delete this.base[date]
				this._clearByDate()
			}
		}
	}
	
	_setBase() {
		this.base = {}
		this.dates = []
	}
}

module.exports = Logger