const Redis = require('ioredis')
const os = require('os')

const Settings = require('./Settings.js')

class Statistics {
	constructor(onError, rabbitMQ) {
		this._onError = onError
		this.rabbitMQ = rabbitMQ
		this.label = this.constructor.name
		this.healthInterval = Settings.statisticsInterval
		
		this.hostname = process.env.HOSTNAME
		this.name = process.env.NAME
		this.path = process.env.AFTER_TILDA
		
		this.redis = new Redis({ host: process.env.PREFIX + 'redis' })
		this.sKey = 'Containers'
		this.hKey = this.sKey + ':' + this.hostname
		
		this._init()
	}
	
	started() {
		let field = 'started'
		this.redis.hset(this.hKey, field, Date.now())
		this.rabbitMQ.send('logger', {type: 'log', label: this.hostname, data: field})
		console.log(this.name + ' has ' + field)
	}
	
	_init() {
		let pipeline = this.redis.pipeline()
		pipeline.sadd(this.sKey, this.hostname)
		pipeline.hset(this.hKey, 'name', this.name)
		pipeline.hset(this.hKey, 'hostname', this.hostname)
		pipeline.hset(this.hKey, 'path', this.path)
		pipeline.hset(this.hKey, 'init', Date.now())
		pipeline.exec()
		
		this._setHealth()
		setInterval(() => {
			this._setHealth()
		}, this.healthInterval)
	}
	
	_setHealth() {
		let pipeline = this.redis.pipeline()
		let date = Date.now()
		pipeline.hset(this.hKey, 'now', date)
		let roundedDate = Math.round(date / this.healthInterval) * this.healthInterval
		let rdKey = this.hKey + ':roundedDates'
		let rdhKey = rdKey + ':' + roundedDate
		let cpu = this._getProcessorUsage()
		let mem = this._getMemory()
		pipeline.hincrby(rdhKey, 'cpu', cpu)
		pipeline.hincrby(rdhKey, 'mem', mem)
		let ttlSeconds = (this.healthInterval / 1000) * 2
		pipeline.expire(rdhKey, ttlSeconds)
		pipeline.sadd(rdKey, roundedDate, (err, result) => {
			if (!err && result && this._previousRoundedDate) {
				this._onNewRoundedDate(rdKey)
			}
		})
		pipeline.exec((err, results) => {
			this._previousRoundedDate = roundedDate
		})
	}
	
	_onNewRoundedDate(rdKey) {
		let previousRoundedDate = this._previousRoundedDate
		let prevRdhKey = rdKey + ':' + previousRoundedDate
		this.redis.hgetall(prevRdhKey, (err, result) => {
			if (!err && result && result.hasOwnProperty('cpu')) {
				let nextPipeline = this.redis.pipeline()
				nextPipeline.hset(this.hKey, 'cpu', result.cpu)
				nextPipeline.hset(this.hKey, 'mem', result.mem)
				nextPipeline.del(prevRdhKey)
				nextPipeline.srem(rdKey, previousRoundedDate)
				nextPipeline.exec()
			}
		})
	}
	
	_getProcessorUsage() {
		let currentCpuObject = {
			cpuDate: process.cpuUsage(),
			date: Date.now()
		}
		
		let currentCpuDate = currentCpuObject.cpuDate.user + currentCpuObject.cpuDate.system
		let lastCpuDate = currentCpuDate
		if (this._lastCpuObject) {
			lastCpuDate = this._lastCpuObject.cpuDate.user + this._lastCpuObject.cpuDate.system
		}
		let cpuTime = (currentCpuDate - lastCpuDate) / 1000
		
		let time = cpuTime
		if (this._lastCpuObject) {
			time = Date.now() - this._lastCpuObject.date
		}
		
		let result = 0
		if (time) {
			result = Math.round((cpuTime / time) * 100)
		}
		
		this._lastCpuObject = currentCpuObject
		
		return result
	}
	
	_getMemory() {
		return Math.round(process.memoryUsage.rss() / 1024 / 1024)
	}
}

module.exports = Statistics