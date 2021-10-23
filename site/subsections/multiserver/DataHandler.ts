const cpus = require('os').cpus().length
const FileHandler = require('../stagePath/_common/FileHandler')
const Redis = require('../stagePath/_common/Redis')
const Settings = require('../stagePath/_common/Settings')
const { Server: WebsocketServer } = require('socket.io')

type onError = (className: string, method: string, error: unknown) => void

interface settings {
	productionDomains: Array<string>,
	developmentDomains: Array<string>,
	stage: string,
	productionStageName: string,
	developmentStageName: string,
	stageByContainerName: ((hostname: string) => string),
	unstaticsContainters: ((hostname: string) => {
		[type: string]: {
			[name: string]: string
		}
	}),
	redisPortByStage: ((stage: string) => number),
}
interface redis {
	hget: ((label: string, key: string) => string),
	smembers: ((key: string) => Array<string>),
}

interface container {
	name: string,
	path: string,
	type: string,
}
export interface containers {
	[hostname: string]: container,
}
export interface staticObjectDomain {
	id: number,
	stage: string,
	domain: string,
	siblingDomain: string,
	ip?: string,
	isCurrent?: boolean,
	Containers?: containers
}
export interface staticObject {
	[domain: string]: staticObjectDomain,
}

type ArrayLengthMutationKeys = 'splice' | 'push' | 'pop' | 'shift' | 'unshift' | number
type ArrayItems<T extends Array<any>> = T extends Array<infer TItems> ? TItems : never
type FixedLengthArray<T extends any[]> =
	Pick<T, Exclude<keyof T, ArrayLengthMutationKeys>>
	& { [Symbol.iterator]: () => IterableIterator< ArrayItems<T> > }
export interface domainStatistics {
	[hostname: string]: FixedLengthArray<[number, number]>,
}

interface shortLogLine {
	date: string,
	type: string,
	value: string
}
export type shortLog = Array<shortLogLine>
export interface domainShortLogData {
	lastDate: string,
	shortLog: shortLog,
}

export interface props {
	staticObject: staticObject,
	error?: unknown
}

class DataHandler {
	onError: onError | void
	readonly label: string
	readonly commonLabel: string
	readonly sKey: string
	staticFileString: string
	error: unknown
	_staticObject: staticObject
	settings!: settings
	redis!: redis | void
	currentDomain!: string
	_domainRedises!: {
		[id: string]: redis | void,
	}
	_shortLogsCache: {
		[domain: string]: domainShortLogData
	}
	
	constructor(onError?: onError) {
		this.onError = onError
		this.label = this.constructor.name
		this.commonLabel = 'commonInfo'
		this.sKey = 'Containers'
		
		const afterTildaPath = (process.env.AFTER_TILDA ?? '') as string
		const sda = (process.env.SDA ?? '') as string
		this.staticFileString = sda + '/' + afterTildaPath + 'stageSensitive/staticObject.json'
		
		this.error = false
		this._staticObject = {}
		this._domainRedises = {}
		this._shortLogsCache = {}
	}
	
	public async setStatic(): Promise<void> {
		try {
			let redis = new Redis(this._onError.bind(this))
			this.redis = await redis.connect()
			
			await this._getStaticObject()
			
			let fileHandler = new FileHandler(this.onError, this.staticFileString)
			await fileHandler.objectToFile(this._staticObject)
		} catch (error) {
			this._onError(this.label, 'initiate', error)
		}
	}
	
	public setDynamic(websocket: any, label: string): void {
		this._setDynamic(websocket, label)
	}
	
	public async getProps(): Promise<props> {
		try {
			let fileHandler = new FileHandler(this._onError.bind(this), this.staticFileString)
			this._staticObject = (await fileHandler.objectFromFile() as staticObject)
		} catch (error) {
			this._onError(this.label, 'getProps', error)
		}
		let props: props = {
			staticObject: this._staticObject,
			error: this.error
		}
		return props
	}
	
	public getDomainShortLogData(domain: string): domainShortLogData {
		return this._shortLogsCache[domain]
	}
	
	private async _getStaticObject(): Promise<void> {
		try {
			let pDomains = Settings.productionDomains
			pDomains.forEach((domain: string, i: number) => {
				let id = i * 2
				let dDomain = Settings.developmentDomains[i]
				this._staticObject[domain] = {
					id,
					stage: Settings.productionStageName,
					domain: domain,
					siblingDomain: dDomain,
				}
				this._staticObject[dDomain] = {
					id: id + 1,
					stage: Settings.developmentStageName,
					domain: dDomain,
					siblingDomain: domain,
				}
			})
			
			if (this.redis) {
				this.currentDomain = await this.redis.hget(this.commonLabel, 'domain')
				this._staticObject[this.currentDomain]['isCurrent'] = true
				
				let currentIp = await this.redis.hget(this.commonLabel, 'currentIp')
				this._setIp(this.currentDomain, currentIp)
				
				let anotherDomain = await this.redis.hget(this.commonLabel, 'anotherDomain')
				let anotherIp = await this.redis.hget(this.commonLabel, 'anotherIp')
				this._setIp(anotherDomain, anotherIp)
				
				let masterIp = await this.redis.hget('Arbiter', 'masterIp')
				this._staticObject[this.currentDomain]['isMaster'] = (masterIp === currentIp)
				let systemUptime = await this.redis.hget(this.commonLabel, 'systemUptime')
				this._staticObject[this.currentDomain]['systemUptime'] = systemUptime
				this._staticObject[this.currentDomain]['now'] = Date.now()
				
				await this._getDomainContainers()
			}
		} catch (error) {
			this._onError(this.label, '_getStaticObject', error)
		}
	}
	
	private async _getDomainContainers(): Promise<void> {
		try {
			for (let i = 0; i < Object.keys(this._staticObject).length; i++) {
				let domain = Object.keys(this._staticObject)[i]
				let stage = this._staticObject[domain].stage
				let redis = this.redis
				if (domain !== this.currentDomain) {
					redis = await this._getDomainRedis(domain, stage)
				} else {
					this._domainRedises[domain] = this.redis
				}
				await this._getContainers(domain, stage, redis)
			}
		} catch (error) {
			this._onError(this.label, '_getDomainContainers', error)
		}
	}
	
	private async _getContainers(domain: string, stage: string, redis: redis | void): Promise<void> {
		try {
			let containers: containers = {}
			
			if (redis) {
				let staticsContainers = await redis.smembers(this.sKey)
				for (let i = 0; i < staticsContainers.length; i++) {
					let hostname = staticsContainers[i]
					let hKey = this.sKey + ':' + hostname
					let name = await redis.hget(hKey, 'name')
					let path = await redis.hget(hKey, 'path')
					let type = '1_main'
					if (path.includes('/subsections/')) {
						type = '2_subsections'
					}
					containers[hostname] = { name, path, type }
				}
			}
			
			let { object } = Settings.unstaticsContainters(stage)
			Object.keys(object).forEach(hostname => {
				containers[hostname] = {
					name: hostname.replace(/^[a-z]\-/, ''),
					path: object[hostname].path,
					type: object[hostname].type
				}
			})
			// this._staticObject[domain][this.sKey] = containers ////////////////// TS is stupid
			this._staticObject[domain]['Containers'] = containers
		} catch (error) {
			this._onError(this.label, '_getContainers', error)
		}
	} 
	
	private _setIp(domain: string, ip: string): void {
		this._staticObject[domain]['ip'] = ip
		let siblingDomain = this._staticObject[domain]['siblingDomain']
		this._staticObject[siblingDomain]['ip'] = ip
	}
	
	private _getDomainRedis(domain: string, stage: string): Promise<redis | void> {
		return new Promise<redis | void>(async success => {
			try {
				setTimeout(() => {
					success()
				}, Settings.standardTimeout * 2)
				let ip = this._staticObject[domain].ip
				let port = Settings.redisPortByStage(stage)
				if (ip && port) {
					if (!this._domainRedises[domain]) {
						let redis = new Redis(this._onError.bind(this))
						let domainRedis = await redis.connect(ip, true, port)
						this._domainRedises[domain] = domainRedis
					}
					success(this._domainRedises[domain])
				}
			} catch (error) {
				this._onError(this.label, '_getDomainRedis catch: ' + domain + ', ' + stage, error)
			}
		}).catch(error => {
			this._onError(this.label, '_getDomainRedis: ' + domain + ', ' + stage, error)
		})
	}
	
	async _setDynamic(websockets: typeof WebsocketServer, label: string) {
		try {
			setInterval(async () => {
				if (websockets) {
					let dynamic = await this._getDynamic()
					websockets.emit(label.toLowerCase(), dynamic)
				}
			}, 500)
		} catch (error) {
			this._onError(this.label, '_setDynamic', error)
		}
	}
	
	async _getDynamic() {
		let statistics = {}
		let shortLogDates = {}
		try {
			for (let i = 0; i < Object.keys(this._domainRedises).length; i++) {
				let domain = Object.keys(this._domainRedises)[i]
				let redis = this._domainRedises[domain]
				let domainStatistics = await this._getDynamicStatistics(domain, redis)
				statistics[domain] = domainStatistics
				let domainShortLogDate = await this._setDomainShortLogs(domain, redis)
				shortLogDates[domain] = domainShortLogDate
			}
		} catch (error) {
			this._onError(this.label, '_getDynamic', error)
		}
		let dynamic = { statistics, shortLogDates }
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
			this._onError(this.label, '_getDynamicStatistics', error)
		}
		return statistics
	}
	
	async _setDomainShortLogs(domain: string, redis: redis | void) {
		let shortLog = []
		let lastDate = false
		try {
			if (redis) {
				let label = 'Logger'
				let dates = await redis.lrange(label + ':dates', 0, 30)
				if (typeof dates === 'object') {
					lastDate = dates[0]
					let cache = this._shortLogsCache[domain]
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
						this._shortLogsCache[domain] = { lastDate, shortLog }
					}
				}
			}
		} catch (error) {
			this._onError(this.label, '_getShortLogs', error)
		}
		return lastDate
	}
	
	_onError(className: string, method: string, error: unknown) {
		console.log(className, method, error)
	}
}

module.exports = DataHandler