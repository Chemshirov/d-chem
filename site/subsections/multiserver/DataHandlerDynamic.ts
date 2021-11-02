const cpus = require('os').cpus().length
const Settings = require('../stagePath/_common/Settings')

class DataHandlerDynamic {
	shortLogsCache: {
		[domain: string]: string
	}
	uptimeDates: {
		[domain: string]: string
	}
	roles: {
		[domain: string]: string
	}
	
	constructor(onError: onError, commonLabel: string) {
		this.onError = onError
		this.commonLabel = commonLabel
		this.label = this.constructor.name
		
		this.shortLogsCache = {}
		this.uptimeDates = {}
		this.roles = {}
	}
	
	async start(websockets: typeof WebsocketServer, label: string, domainRedises) {
		try {
			this._domainRedises = domainRedises
			setInterval(async () => {
				try {
					if (websockets) {
						let dynamic = await this._getDynamic()
						websockets.emit(label.toLowerCase(), dynamic)
					}
				} catch (error) {
					this.onError(this.label, '_setDynamic setInterval', error)
				}
			}, Settings.standardTimeout / 2)
		} catch (error) {
			this.onError(this.label, '_setDynamic', error)
		}
	}
	
	async _getDynamic() {
		let statistics = {}
		let shortLogDates = {}
		let haveUptimeDatesChanged = false
		let haveRolesChanged = false
		try {
			for (let i = 0; i < Object.keys(this._domainRedises).length; i++) {
				let domain = Object.keys(this._domainRedises)[i]
				let redis = this._domainRedises[domain]
				let domainStatistics = await this._getDynamicStatistics(domain, redis)
				statistics[domain] = domainStatistics
				let domainShortLogDate = await this._setDomainShortLogs(domain, redis)
				shortLogDates[domain] = domainShortLogDate
				let haveDomainUptimeDatesChanged = await this._tryToUpdateDomainUptimeDates(domain, redis)
				if (haveDomainUptimeDatesChanged) {
					haveUptimeDatesChanged = true
				}
				let hasDomainRoleChanged = await this._hasDomainRoleChanged(domain, redis)
				if (hasDomainRoleChanged) {
					haveRolesChanged = true
				}
			}
		} catch (error) {
			this.onError(this.label, '_getDynamic', error)
		}
		let dynamic = { statistics, shortLogDates }
		if (haveUptimeDatesChanged) {
			dynamic.uptimeDates = this.uptimeDates
		}
		if (haveRolesChanged) {
			dynamic.roles = this.roles
		}
		return dynamic
	}
	
	async _getDynamicStatistics(domain: string, redis: redis | void) {
		let statistics = {}
		try {
			let allString = await redis.hgetall('Containers:metrics')
			if (allString) {
				Object.keys(allString).forEach(hostname => {
					let metricsString = allString[hostname]
					let metricsArray = metricsString.split(':')
					let now = +metricsArray[2]
					if ((Date.now() - now) < Settings.standardTimeout) {
						let cpu = Math.ceil(metricsArray[0] * 100 / cpus) / 100
						let mem = Math.ceil(metricsArray[1])
						statistics[hostname] = [cpu, mem]
					}
				})
			}
		} catch (error) {
			this.onError(this.label, '_getDynamicStatistics ' + domain, error)
		}
		return statistics
	}
	
	async _setDomainShortLogs(domain: string, redis: redis | void) {
		let shortLog = []
		let lastDate = false
		try {
			let label = 'Logger'
			let dates = await redis.lrange(label + ':dates', 0, 30)
			if (typeof dates === 'object') {
				lastDate = dates[0]
				let cache = this.shortLogsCache[domain]
				if (cache && cache.lastDate === lastDate) {
					shortLog = cache.shortLog
				} else {
					for (let i =0; i < dates.length; i++) {
						let date = dates[i]
						let type = 'logs'
						let value = await redis.hget(label + ':' + type, date)
						if (!value) {
							type = 'errors'
							value = await redis.hget(label + ':' + type, date)
						}
						shortLog.push({ date, type, value })
					}
					this.shortLogsCache[domain] = { lastDate, shortLog }
				}
			}
		} catch (error) {
			this.onError(this.label, '_setDomainShortLogs', error)
		}
		return lastDate
	}
	
	async _tryToUpdateDomainUptimeDates(domain, redis) {
		let changed = false
		try {
			let systemUptime = await redis.hget(this.commonLabel, 'systemUptime')
			if (!this.uptimeDates[domain]) {
				this.uptimeDates[domain] = {}
			}
			if (systemUptime && systemUptime !== this.uptimeDates[domain].systemUptime) {
				this.uptimeDates[domain] = {
					systemUptime,
					now: Date.now()
				}
				changed = true
			}
		} catch (error) {
			this.onError(this.label, '_getDomainUptimeDates', error)
		}
		return changed
	}
	
	async _hasDomainRoleChanged(domain, redis) {
		let hasChanged = false
		try {
			let masterIp = await redis.hget('Arbiter', 'masterIp')
			let currentIp = await redis.hget(this.commonLabel, 'currentIp')
			let role = 'slave'
			if (masterIp === currentIp) {
				role = 'master'
			}
			if (this.roles[domain] !== role) {
				this.roles[domain] = role
				hasChanged = true
			}
		} catch (error) {
			this.onError(this.label, '_hasDomainRoleChanged', error)
		}
		return hasChanged
	}
}

module.exports = DataHandlerDynamic