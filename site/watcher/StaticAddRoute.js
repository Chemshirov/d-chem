const fs = require('fs')
const Redis = require('../../_common/Redis.js')
const Settings = require('../../_common/Settings.js')
const sha1 = require('sha1')
const zlib = require('zlib')

class StaticAddRoute {
	constructor(onError, rabbitMQ) {
		this.onError = onError
		this.rabbitMQ = rabbitMQ
		this.label = this.constructor.name
		this.routeTable = Settings.staticRouteTable()
		this.rabbitMQ.subscribe(this._addFiles.bind(this), 'AddFilesToRouter')
	}
	
	async add(fileString) {
		try {
			let answer = 'fail'
			let routes = Object.keys(this.routeTable)
			for (let i = 0; i < routes.length; i++) {
				let routeBeginning = routes[i]
				let regExp = new RegExp('^' + routeBeginning.split(' ')[0])
				if ((regExp).test(fileString)) {
					let clientSideReplacement = this.routeTable[routeBeginning]
					if (typeof clientSideReplacement === 'object') {
						for (let j = 0; j < clientSideReplacement.length; j++) {
							let toClientsPath = clientSideReplacement[j]
							let clientsPath = fileString.replace(regExp, toClientsPath)
							answer = await this.work(clientsPath, fileString)
						}
					}
				}
			}
			return answer
		} catch(error) {
			this.onError(this.label, 'add', error)
		}
	}
	
	async work(clientsPath, fileString) {
		try {
			let stat = fs.statSync(fileString)
			let fileProperties = {
				fileString,
				size: stat.size,
				lastModified: stat.mtime.toUTCString()
			}
			let gzip = false
			if (stat.size < Settings.staticSizeLimit) {
				let file = fs.readFileSync(fileString)
				let eTag = sha1(file.toString())
				fileProperties.eTag = eTag
				gzip = zlib.gzipSync(file)
				fileProperties.gzip = !!gzip
			}
			let longTTl01if = (/libraries/).test(fileString)
			let longTTl02if = !(/\.(js|jsx|ts|css)/).test(fileString)
			if (longTTl01if || longTTl02if) {
				fileProperties.ttl = Settings.staticTtl
			}
			await this._addToRedis(clientsPath, fileProperties, gzip)
			return fileProperties
		} catch(error) {
			if (!(error && error.code === 'ENOENT')) {
				this.onError(this.label, 'work catch', error)
			}
		}
	}
	
	async _addToRedis(fromString, object, gzip) {
		try {
			if (!this.redis) {
				let redis = new Redis(this.onError)
				this.redis = await redis.connect()
			}
			let key = 'StaticFiles:' + fromString
			await this.redis.hmset(key, object)
			if (gzip) {
				await this.redis.set(key + ':gzip', gzip)
			}
		} catch(error) {
			this.onError(this.label, '_addToRedis', error)
		}
	}
	
	async _addFiles(filesArray, remove) {
		try {
			if (!remove) {
				for (let i = 0; i < filesArray.length; i++) {
					let fileString = filesArray[i]
					await this.add(fileString)
				}
			} else {
				// write remove files
			}
		} catch(error) {
			this.onError(this.label, '_addFiles', error)
		}
	}
}

module.exports = StaticAddRoute