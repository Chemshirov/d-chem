const fs = require('fs')
const Redis = require('./Redis.js')
const Settings = require('./Settings.js')

class Statistics {
	constructor(onError, log) {
		this._onError = onError
		this.log = log
		
		this.label = this.constructor.name
		this.hostname = process.env.HOSTNAME
		this.name = process.env.NAME
		this.path = process.env.AFTER_TILDA
		
		this.sKey = 'Containers'
		this.hKey = this.sKey + ':' + this.hostname
	}
	
	async started() {
		try {
			let field = 'started'
			await this.redis.hset(this.hKey, field, Date.now())
			this.log(this.name + ' has ' + field)
		} catch(error) {
			this._onError(this.label, 'started', error)
		}
	}
	
	async connect() {
		try {
			let redis = new Redis(this._onError)
			this.redis = await redis.connect()
			await this.redis.pipe([
				['sadd', this.sKey, this.hostname],
				['hset', this.hKey, 'name', this.name],
				['hset', this.hKey, 'hostname', this.hostname],
				['hset', this.hKey, 'path', this.path],
				['hset', this.hKey, 'init', Date.now()],
			])
			this._setMetrics()
			if (this.metricsSI) {
				clearInterval(this.metricsSI)
			}
			this.metricsSI = setInterval(() => {
				this._setMetrics()
			}, Settings.statisticsInterval)
		} catch(error) {
			this._onError(this.label, 'connect', error)
		}
	}
	
	end() {
		if (this.metricsSI) {
			clearInterval(this.metricsSI)
		}
		this.redis.end(true)
	}
	
	async _setMetrics() {
		try {
			let date = Date.now()
			let { cpu, memoryUsed } = await this._getMetrics()
			await this.redis.pipe([
				['hset', this.hKey, 'now', date],
				['hset', this.hKey, 'cpu', cpu],
				['hset', this.hKey, 'mem', memoryUsed],
			])
		} catch(error) {
			this._onError(this.label, '_setMetrics', error)
		}
	}
	
	async _getMetrics() {
		try {
			let cpu = await this._getProcessorUsage()
			let memoryUsed = await this._getMemory()
			return { cpu, memoryUsed }
		} catch(error) {
			this._onError(this.label, '_getMetrics', error)
		}
	}
	
	_getProcessorUsage() {
		return new Promise(success => {
			fs.readFile('/sys/fs/cgroup/cpuacct/cpuacct.usage', (error, result) => {
				if (error) {
					this._onError(this.label, '_getProcessorUsage readFile', error)
				} else {
					let currentCpuObject = {
						cpuDate: result.toString().trim(),
						date: Date.now()
					}
					
					let lastCpuDate = currentCpuObject.cpuDate
					if (this._lastCpuObject) {
						lastCpuDate = this._lastCpuObject.cpuDate
					}
					let cpuTime = (currentCpuObject.cpuDate - lastCpuDate) / 1e6
					
					let time = cpuTime
					if (this._lastCpuObject) {
						time = Date.now() - this._lastCpuObject.date
					}
					
					let cpu = 0
					if (time) {
						cpu = Math.round((cpuTime / time) * 100)
					}
					
					this._lastCpuObject = currentCpuObject
					
					success(cpu)
				}
			})
		}).catch(error => {
			this._onError(this.label, '_getProcessorUsage', error)
		})
	}
	
	_getMemory() {
		return new Promise(success => {
			let doNotUse = 'memory.usage_in_bytes!' + 'It includes cache that grows using http proxy (and seeing films)'
			fs.readFile('/sys/fs/cgroup/memory/memory.stat', (error, result) => {
				if (error) {
					this._onError(this.label, '_getMemory readFile', error)
				} else {
					let mem = 0
					let memoryStrings = result.toString().trim().split('\n')
					memoryStrings.some(memoryString => {
						let pair = memoryString.split(' ')
						if (pair[0] === 'rss') {
							let MemInBytes = Number(pair[1])
							if (MemInBytes > 1024) {
								mem = Math.round(MemInBytes / 1024 / 1024)
								return true
							}
						}
					})
					success(mem)
				}
			})
		}).catch(error => {
			this._onError(this.label, '_getMemory', error)
		})
	}
	
		// async _setHealth() {
		// try {
			// let date = Date.now()
			// let { cpu, memoryUsed } = await this._getMetrics()
			// let roundedDate = Math.round(date / this.healthInterval) * this.healthInterval
			// let rdKey = this.hKey + ':roundedDates'
			// let rdhKey = rdKey + ':' + roundedDate
			// let ttlSeconds = (this.healthInterval / 1000) * 2
			// await this.redis.pipe([
				// ['hset', this.hKey, 'now', date],
				// ['hincrby', rdhKey, 'cpu', cpu],
				// ['hincrby', rdhKey, 'mem', memoryUsed],
				// ['expire', rdhKey, ttlSeconds],
				// ['sadd', rdKey, roundedDate],
			// ])
			// await this._onNewRoundedDate(rdKey)
			// this._previousRoundedDate = roundedDate
		// } catch(error) {
			// this._onError(this.label, '_setHealth', error)
		// }
	// }
	
	// async _onNewRoundedDate(rdKey) {
		// try {
			// if (this._previousRoundedDate) {
				// let previousRoundedDate = this._previousRoundedDate
				// let prevRdhKey = rdKey + ':' + previousRoundedDate
				// let result = await this.redis.hgetall(prevRdhKey)
				// if (result && result.hasOwnProperty('cpu')) {
					// await this.redis.pipe([
						// ['hset', this.hKey, 'cpu', result.cpu],
						// ['hset', this.hKey, 'mem', result.mem],
						// ['del', prevRdhKey],
						// ['srem', rdKey, previousRoundedDate],
					// ])
				// }
			// }
		// } catch(error) {
			// this._onError(this.label, '_onNewRoundedDate', error)
		// }
	// }
}

module.exports = Statistics