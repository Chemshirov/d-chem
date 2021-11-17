import * as t from './types' 
import * as tc from '../../../_common/types'
const cpus: number = require('os').cpus().length
const Settings: tc.settings = require('../stagePath/_common/Settings')

class DataHandlerDynamic {
	public onError: t.share['onError']
	private readonly commonLabel: string
	private readonly label: string
	public shortLogsCache: t.shortLogsCache
	private uptimeDates: t.domains<tc.keyValue<string | number>>
	private roles: t.domains<string>
	private _domainRedises!: t.domains<tc.redis>
	
	constructor(onError: t.share['onError'], commonLabel: string) {
		this.onError = onError
		this.commonLabel = commonLabel
		this.label = this.constructor.name
		this.shortLogsCache = {}
		this.uptimeDates = {}
		this.roles = {}
	}
	
	public async start(websockets: tc.websockets, label: string, domainRedises: t.domains<tc.redis>): Promise<void> {
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
	
	private async _getDynamic(): Promise<t.dynamic> {
		let statistics: t.domains<t.statistics> = {}
		let shortLogDates: t.domains<t.stringOrFalse> = {}
		let haveUptimeDatesChanged = false
		let haveRolesChanged = false
		try {
			for (let i = 0; i < Object.keys(this._domainRedises).length; i++) {
				let domain = Object.keys(this._domainRedises)[i]
				let redis = this._domainRedises[domain]
				let domainStatistics = await this._getDynamicStatistics(domain, redis)
				if (Object.keys(domainStatistics).length) {
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
				} else {
					this.roles[domain] = ''
					haveRolesChanged = true
				}
			}
		} catch (error) {
			this.onError(this.label, '_getDynamic', error)
		}
		
		let dynamic: t.dynamic = { statistics, shortLogDates }
		if (haveUptimeDatesChanged) {
			dynamic.uptimeDates = this.uptimeDates
		}
		if (haveRolesChanged) {
			dynamic.roles = this.roles
		}
		return dynamic
	}
	
	private async _getDynamicStatistics(domain: string, redis: tc.redis): Promise<t.statistics> {
		let statistics: t.statistics = {}
		try {
			let allString = await redis.hgetall('Containers:metrics')
			if (allString) {
				Object.keys(allString).forEach(hostname => {
					let metricsString = allString[hostname]
					let metricsArray: string[] = metricsString.split(':')
					let now = +metricsArray[2]
					if ((Date.now() - now) < Settings.standardTimeout) {
						let cpu = Math.ceil(+metricsArray[0] * 100 / cpus) / 100
						let mem = Math.ceil(+metricsArray[1])
						statistics[hostname] = [cpu, mem]
					}
				})
			}
		} catch (error) {
			this.onError(this.label, '_getDynamicStatistics ' + domain, error)
		}
		return statistics
	}
	
	private async _setDomainShortLogs(domain: string, redis: tc.redis): Promise<t.stringOrFalse> {
		let shortLog: t.shortLog = []
		let lastDate: t.stringOrFalse = false
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
	
	private async _tryToUpdateDomainUptimeDates(domain: string, redis: tc.redis): Promise<boolean> {
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
	
	private async _hasDomainRoleChanged(domain: string, redis: tc.redis): Promise<boolean> {
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