const fs = require('fs')
const Settings = require('../../_common/Settings.js')

class ContainersHandler {
	constructor(setupObject) {
		this.onError = setupObject.onError
		this.log = setupObject.log
		this.rabbitMQ = setupObject.rabbitMQ
		this.redis = setupObject.redis
		this.label = this.constructor.name
		
		this.sKey = 'Containers'
	}
	
	async start() {
		try {
			this._setMemoryLimiter()
			this._dockerStatsToRedis()
		} catch(error) {
			this.onError(this.label, 'start', error)
		}
	}
	
	_setMemoryLimiter() {
		this._memoryLimiter()
		setInterval(() => {
			this._memoryLimiter()
		}, Settings.watcherWait)
	}
	
	async _memoryLimiter() {
		try {
			let containersList = await this.redis.smembers(this.sKey)
			if (containersList) {
				for (let i = 0; i < containersList.length; i++) {
					let containerName = containersList[i]
					let hKey = this.sKey + ':' + containerName
					let memoryUsed = await this.redis.hget(hKey, 'mem')
					let previousMemoryUsed = this._memoryLimiter[containerName] || 0
					let limit = Settings.watcherMemoryLimitForContainerName(containerName)
					if (memoryUsed > limit && previousMemoryUsed > limit) {
						let containerPath = await this.redis.hget(hKey, 'path')
						let data = [ containerName, memoryUsed, previousMemoryUsed ]
						this.log({ label: 'memoryLimitRestart', data })
						let message = {
							type: 'start',
							path: containerPath
						}
						this.rabbitMQ.send({ label: 'Dockerrun', message })
					}
					this._memoryLimiter[containerName] = memoryUsed
				}
			}
		} catch (error) {
			this.onError(this.label, '_memoryLimiter', error)
		}
	}
	
	async _dockerStatsToRedis() {
		try {
			await this._writeStatsToRedis()
			setTimeout(() => {
				this._dockerStatsToRedis()
			}, Settings.standardTimeout / 2)
		} catch(error) {
			this.onError(this.label, '_dockerStatsToRedis', error)
		}
	}
	
	_writeStatsToRedis() {
		return new Promise(success => {
			let { object: otherContainters } = Settings.otherContainters(Settings.stage)
			let date = Date.now()
			let pipe = []
			let statsFileString = '/usr/nodejs/sda/' + Settings.stage + '/dockerStats.txt'
			fs.readFile(statsFileString, async (error, data) => {
				try {
					if (error) {
						this.onError(this.label, '_writeStatsToRedis fs.readFile', error)
					} else {
						let stats = {}
						let regExp = /^([^ ]+) ([0-9\.]+)% ([0-9\.]+)M.*$/
						let lines = data.toString().split('\n')
						for (let i = 0; i < lines.length; i++) {
							let line = lines[i]
							if ((regExp).test(line)) {
								let hostname = line.replace(regExp, '$1')
								let cpu = +line.replace(regExp, '$2')
								let mem = +line.replace(regExp, '$3')
								stats[hostname] = { cpu, mem }
							}
						}
						let statsArray = Object.keys(stats)
						for (let i = 0; i < statsArray.length; i++) {
							let hostname = statsArray[i]
							// if (otherContainters[hostname]) {
								let { cpu, mem } = stats[hostname]
								let dataString = cpu + ':' + mem + ':' + date
								pipe.push(['hset', this.sKey + ':metrics', hostname, dataString])
							// }
						}
					}
					if (pipe.length) {
						await this.redis.pipe(pipe)
					}
					success()
				} catch (error) {
					this.onError(this.label, '_writeStatsToRedis fs.readFile catch', error)
				}
			})
		}).catch(error => {
			this.onError(this.label, '_writeStatsToRedis', error)
		})
	}
}

module.exports = ContainersHandler