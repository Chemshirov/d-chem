import * as t from './types'
import * as tc from '../../../_common/types'

const DataHandlerDynamic = require('./DataHandlerDynamic')
const FileHandler = require('../stagePath/_common/FileHandler')
const Redis = require('../stagePath/_common/Redis')
const Settings: tc.settings = require('../stagePath/_common/Settings')

class DataHandler { 
	private onError: t.share['onError'] | void
	private redis: t.share['redis'] | void
	private readonly label: string
	private readonly commonLabel: string
	private readonly sKey: 'Containers'
	private readonly staticFileString: string
	private error: false | unknown
	private _staticObject: t.staticObject
	private currentDomain!: string
	private domainRedises!: t.domains<tc.redis>
	private dataHandlerDynamic!: typeof DataHandlerDynamic
	
	constructor(object?: t.share) {
		if (object) {
			this.onError = object.onError
			this.redis = object.redis
		}
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
	
	public setDynamic(websocket: tc.websockets, label: string): void {
		if (!this.dataHandlerDynamic) {
			this.dataHandlerDynamic = new DataHandlerDynamic(this.onError, this.commonLabel)
			this.dataHandlerDynamic.start(websocket, label, this.domainRedises)
		}
	}
	
	public async getProps(): Promise<t.props> {
		try {
			let fileHandler = new FileHandler(this._onError.bind(this), this.staticFileString)
			this._staticObject = (await fileHandler.objectFromFile() as t.staticObject)
		} catch (error) {
			this._onError(this.label, 'getProps', error)
		}
		let props: t.props = {
			staticObject: this._staticObject,
			error: this.error
		}
		return props
	}
	
	public getDomainShortLogData(domain: string): t.domainShortLogsCache {
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
			
			if (this.redis) {
				this.currentDomain = await this.redis.hget(this.commonLabel, 'domain')
				this._staticObject[this.currentDomain]['isCurrent'] = true
				
				let currentIp = await this.redis.hget(this.commonLabel, 'currentIp')
				this._setIp(this.currentDomain, currentIp)
				
				let anotherDomain = await this.redis.hget(this.commonLabel, 'anotherDomain')
				let anotherIp = await this.redis.hget(this.commonLabel, 'anotherIp')
				this._setIp(anotherDomain, anotherIp)
				
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
				if (this.redis) {
					let redis: tc.redis | void = this.redis
					if (domain !== this.currentDomain) {
						redis = await this._getDomainRedis(domain, stage)
					} else {
						this.domainRedises[domain] = this.redis
					}
					await this._getContainers(domain, stage, redis)
				}
			}
		} catch (error) {
			this._onError(this.label, '_getDomainContainers', error)
		}
	}
	
	private async _getContainers(domain: string, stage: string, redis: tc.redis | void): Promise<void> {
		try {
			let containers: t.containers = {} 
			if (redis) {
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
			}
			
			let { object } = Settings.otherContainters(stage)
			Object.keys(object).forEach(hostname => {
				containers[hostname] = {
					name: hostname.replace(/^[a-z]\-/, ''),
					path: object[hostname].path,
					type: object[hostname].type
				}
			})
			
			this._staticObject[domain][this.sKey] = containers
		} catch (error) {
			this._onError(this.label, '_getContainers', error)
		}
	} 
	
	private _setIp(domain: string, ip: string): void {
		this._staticObject[domain]['ip'] = ip
		let siblingDomain = this._staticObject[domain]['siblingDomain']
		this._staticObject[siblingDomain]['ip'] = ip
	}
	
	private _getDomainRedis(domain: string, stage: string): Promise<tc.redis | void> {
		return new Promise<tc.redis | void>(async success => {
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
	
	private _onError(className: string, method: string, error: unknown): void {
		console.log(className, method, error)
	}
}

module.exports = DataHandler