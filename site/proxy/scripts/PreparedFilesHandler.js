const fs = require('fs')
const Redis = require('../../../_common/Redis.js')
const RequestHandler = require('./RequestHandler.js')
const ResponseHandler = require('./ResponseHandler.js')
const Settings = require('../../../_common/Settings.js')

class PreparedFilesHandler {
	constructor(onError, rabbitMQ) {
		this.onError = onError
		this.rabbitMQ = rabbitMQ
		this.label = this.constructor.name
		this._redises = {}
		this._stageFilePathes = {
			[Settings.productionStageName]: {},
			[Settings.developmentStageName]: {}
		}
		this._failToSentUrlCache = {}
	}
	
	async start() {
		try {
			this.rabbitMQ.receive({ callback: this._onReceive.bind(this) })
			await this._getFilePathesFromRedis(Settings.productionStageName)
			await this._getFilePathesFromRedis(Settings.developmentStageName)
		} catch (error) {
			this.onError(this.label, 'start', error)
		}
	}
	
	async tryToSend(request, response) {
		let sentType = null
		try {
			let requestHandler = new RequestHandler(request)
			let cleanUrl = requestHandler.getCleanUrl()
			if (!this._failToSentUrlCache[cleanUrl]) {
				if (!requestHandler.isUpgrade) {
					if (!requestHandler.isNextJsDev) {
						let url = cleanUrl
						if (url.startsWith('/audiobooks')) {
							let regExp = /^(\/[^\/]+\/[^\/]+\/)([^\/]+)\/([^\/]+)\/([^\/]+\.mp3)$/
							let path = url.replace(regExp, '$1')
							let author = url.replace(regExp, '$2')
							let name = url.replace(regExp, '$3')
							let file = url.replace(regExp, '$4')
							url = path + author + ' - ' + name + '/' + file
						}
						let fileProps = await this._getFileProps(url, requestHandler.stage)
						if (fileProps) {
							let responseHandler = new ResponseHandler(response, this.onError)
							sentType = await responseHandler.tryStreamFile(request, fileProps)
						}
					}
				}
				if (!sentType) {
					this._failToSentUrlCache[cleanUrl] = true
				}
			}
		} catch (error) {
			this.onError(this.label, 'tryToSend', error)
		}
		return sentType
	}
	
	async _getFileProps(pathToFile, stage) {
		let fileProps = null
		try {
			if (!stage) {
				stage = Settings.productionStageName
			}
			if (this._stageFilePathes[stage][pathToFile]) {
				fileProps = await this._getPropsFromRedis(stage, pathToFile)
			}
		} catch (error) {
			this.onError(this.label, 'getFileProps ' + pathToFile, error)
		}
		return fileProps
	}
	
	async _getPropsFromRedis(stage, pathToFile) {
		return new Promise(async success => {
			try {
				setTimeout(() => {
					success(null)
				}, Settings.standardTimeout)
				let redis = this._getRedis(stage)
				let key = 'StaticFiles:' + pathToFile
				let fileProps = await redis.hgetall(key)
				if (fileProps && Object.keys(fileProps).length) {
					if (fileProps.gzip) {
						let bufferKey = Buffer.from(key + ':gzip')
						let gzip = await redis.get(bufferKey)
						fileProps.gzip = gzip
					}
				}
				success(fileProps)
			} catch (error) {
				this.onError(this.label, '_getPropsFromRedis catch2 ' + pathToFile, error)
			}
		}).catch(error => {
			this.onError(this.label, '_getPropsFromRedis catch1 ' + pathToFile, error)
		})
	}
	
	async _onNewFileList(fileList, stage) {
		if (stage && fileList && typeof fileList === 'object') {
			fileList.forEach(filePath => {
				this._stageFilePathes[stage][filePath] = {}
			})
		}
	}
	
	async _getFilePathesFromRedis(stage) {
		try {
			let redis = this._getRedis(stage)
			let sKey = 'StaticFiles:List'
			let list = await redis.smembers(sKey)
			if (list) {
				list.forEach(filePath => {
					this._stageFilePathes[stage][filePath] = {}
				})
			}
		} catch (error) {
			this.onError(this.label, '_getFilePathesFromRedis', error)
		}
	}
	
	_getRedis(stage) {
		if (!this._redises[stage]) {
			let prefix = stage.substring(0, 1) + '-'
			let redis = new Redis(this.onError, prefix + 'redis', Settings.redisDefaultPort)
			this._redises[stage] = redis
		}
		return this._redises[stage]
	}
	
	_onReceive(object) {
		if (object.request === 'changeStatic' && object.method === 'add' && object.result) {
			this._onNewFileList(object.result, object.stage)
		}
	}
}

module.exports = PreparedFilesHandler