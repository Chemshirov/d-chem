const { Buffer } = require('buffer')
const Redis = require('../../../../_common/Redis.js')
const Settings = require('../../../../_common/Settings.js')
const WorkerThreadSetter = require('../../../../_common/WorkerThreadSetter.js')

class StaticsWorker extends WorkerThreadSetter {
	constructor() {
		super()
		this.label = this.constructor.name
		this.cache = {
			[Settings.productionStageName]: {},
			[Settings.developmentStageName]: {}
		}
		this.timeouts = {}
	}
	
	async start(object) {
		try {
			this._getFromRedis(Settings.productionStageName)
			this._getFromRedis(Settings.developmentStageName)
		} catch (error) {
			this.onError(this.label, 'start', error)
		}
	}
	
	async getFileProps(object) {
		try {
			let fileProps = false
			let { url, stage } = object
			if (this.cache[stage][url]) {
				if (this.cache[stage][url]['fileProps']) {
					fileProps = this.cache[stage][url]['fileProps']
					this._setCacheExpire(stage, url)
				} else {
					fileProps = await this._getPropsFromRedis(url, stage)
					if (fileProps && fileProps.fileString) {
						this.post({ label: 'addToCache', url, stage, fileProps })
					}
				}
			}
			return fileProps
		} catch (error) {
			this._onError(this.label, 'getFileProps catch ' + object.url, error)
		}
	}
	
	async _getPropsFromRedis(url, stage) {
		return new Promise(async success => {
			try {
				setTimeout(() => {
					success(false)
				}, Settings.standardTimeout)
				let redisConnected = await this._getRedis(stage)
				let key = 'StaticFiles:' + url
				let fileProps = await redisConnected.hgetall(key)
				if (fileProps && Object.keys(fileProps).length) {
					if (fileProps.gzip) {
						let bufferKey = Buffer.from(key + ':gzip')
						let gzip = await redisConnected.get(bufferKey)
						fileProps.gzip = gzip
					}
				}
				success(fileProps)
			} catch (error) {
				this._onError(this.label, '_getPropsFromRedis catch2 ' + url, error)
			}
		}).catch(error => {
			this._onError(this.label, '_getPropsFromRedis catch1 ' + url, error)
		})
	}
	
	async onNewFileList(object) {
		if (object && typeof object.fileList === 'object') {
			// this.log('onNewFileList', object.stage, 'list length: ' + object.fileList.length, object.fileList[0])
			object.fileList.forEach(filePath => {
				this.cache[object.stage][filePath] = {}
			})
		}
	}
	
	addToCache(object) {
		let { url, stage, fileProps } = object
		if (fileProps.gzip && typeof fileProps.gzip.length !== 'number') {
			let gzipArray = []
			Object.keys(fileProps.gzip).forEach(i => {
				gzipArray.push(fileProps.gzip[i])
			})
			fileProps.gzip = gzipArray
		}
		if (this.cache[stage] && this.cache[stage][url]) {
			this.cache[stage][url]['fileProps'] = fileProps
			this._setCacheExpire(stage, url)
		}
	}
	
	async _getFromRedis(stage) {
		try {
			let redisConnected = await this._getRedis(stage)
			let sKey = 'StaticFiles:List'
			let list = await redisConnected.smembers(sKey)
			if (list) {
				list.forEach(filePath => {
					this.cache[stage][filePath] = {}
				})
			}
		} catch (error) {
			this._onError(this.label, '_getFromRedis', error)
		}
	}
	
	async _getRedis(stage) {
		try {
			if (!this._redises) {
				this._redises = {}
			}
			let redisConnected = this._redises[stage]
			if (redisConnected) {
				return redisConnected
			} else {
				let prefix = stage.charAt(0) + '-'
				let redis = new Redis(this.onError)
				redisConnected = await redis.connect(prefix + 'redis')
				if (redisConnected) {
					this._redises[stage] = redisConnected
				}
			}
			return redisConnected
		} catch (error) {
			this._onError(this.label, '_getRedis', error)
		}
	}
	
	_setCacheExpire(stage, url) {
		if (this.timeouts[stage + url]) {
			clearTimeout(this.timeouts[stage + url])
		}
		this.timeouts[stage + url] = setTimeout(() => {
			if (this.cache[stage][url]['fileProps']) {
				delete this.cache[stage][url]['fileProps']
			}
		}, Settings.proxyCacheTtl)
	}
}

new StaticsWorker()