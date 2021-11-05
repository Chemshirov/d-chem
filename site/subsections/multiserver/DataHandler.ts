const DataHandlerDynamic = require('./DataHandlerDynamic')
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
	otherContainters: ((hostname: string) => {
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
	domainRedises!: {
		[id: string]: redis | void,
	}
	
	constructor(onError?: onError, redis) {
		this.onError = onError
		this.redis = redis
		
		this.label = this.constructor.name
		this.commonLabel = 'commonInfo'
		this.sKey = 'Containers'
		
		const afterTildaPath = (process.env.AFTER_TILDA ?? '') as string
		const sda = (process.env.SDA ?? '') as string
		this.staticFileString = sda + '/' + afterTildaPath + 'stageSensitive/staticObject.json'
		
		this.error = false
		this._staticObject = {}
		this.domainRedises = {}
	}
	
	public async setStatic(): Promise<void> {
		try {
			await this._getStaticObject()
			
			let fileHandler = new FileHandler(this.onError, this.staticFileString)
			await fileHandler.objectToFile(this._staticObject)
		} catch (error) {
			this._onError(this.label, 'initiate', error)
		}
	}
	
	public setDynamic(websocket: any, label: string): void {
		if (!this.dataHandlerDynamic) {
			this.dataHandlerDynamic = new DataHandlerDynamic(this.onError, this.commonLabel)
			this.dataHandlerDynamic.start(websocket, label, this.domainRedises)
		}
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
		return this.dataHandlerDynamic.shortLogsCache[domain]
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
			
			this.currentDomain = await this.redis.hget(this.commonLabel, 'domain')
			this._staticObject[this.currentDomain]['isCurrent'] = true
			
			let currentIp = await this.redis.hget(this.commonLabel, 'currentIp')
			this._setIp(this.currentDomain, currentIp)
			
			let anotherDomain = await this.redis.hget(this.commonLabel, 'anotherDomain')
			let anotherIp = await this.redis.hget(this.commonLabel, 'anotherIp')
			this._setIp(anotherDomain, anotherIp)
			
			if (0) {
				let masterIp = await this.redis.hget('Arbiter', 'masterIp') //
				this._staticObject[this.currentDomain]['isMaster'] = (masterIp === currentIp) //
				let systemUptime = await this.redis.hget(this.commonLabel, 'systemUptime') //
				this._staticObject[this.currentDomain]['systemUptime'] = systemUptime //
				this._staticObject[this.currentDomain]['now'] = Date.now() //
			}
			await this._getDomainContainers()
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
					this.domainRedises[domain] = this.redis
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
			let staticsContainers = await redis.smembers(this.sKey)
			for (let i = 0; i < staticsContainers.length; i++) {
				let hostname = staticsContainers[i]
				let hKey = this.sKey + ':' + hostname
				let name = await redis.hget(hKey, 'name')
				let path = await redis.hget(hKey, 'path')
				let type = await redis.hget(hKey, 'type')
				if (!type) {
					type = '1_main'
					if (path.includes('/subsections/')) {
						type = '2_subsections'
					}
				}
				containers[hostname] = { name, path, type }
			}
			
			let { object } = Settings.otherContainters(stage)
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
					if (!this.domainRedises[domain]) {
						let domainRedis = new Redis(this._onError.bind(this), ip, port)
						this.domainRedises[domain] = domainRedis
					}
					success(this.domainRedises[domain])
				}
			} catch (error) {
				this._onError(this.label, '_getDomainRedis catch: ' + domain + ', ' + stage, error)
			}
		}).catch(error => {
			this._onError(this.label, '_getDomainRedis: ' + domain + ', ' + stage, error)
		})
	}
	
	_onError(className: string, method: string, error: unknown) {
		console.log(className, method, error)
	}
}

module.exports = DataHandler