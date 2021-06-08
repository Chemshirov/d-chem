const fs = require('fs')
const Redis = require('ioredis')
const sha1 = require('sha1')
const zlib = require('zlib')

const Settings = require('../../_common/Settings.js')

class AddRoute {
	constructor(onError) {
		this._onError = onError
		this.label = this.constructor.name
		
		this.routeTable = Settings.staticRouteTable()
		this.redis = new Redis({ host: process.env.PREFIX + 'redis' })
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
		} catch(err) {
			this._onError(this.label, 'add', err)
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
		} catch(err) {
			this._onError(this.label, 'work catch', err)
		}
	}
	
	async _addToRedis(fromString, object, gzip) {
		try {
			let key = 'StaticFiles:' + fromString
			await this.redis.hmset(key, object)
			if (gzip) {
				await this.redis.set(key + ':gzip', gzip)
			}
		} catch(err) {
			this._onError(this.label, '_addToRedis', err)
		}
	}
}

module.exports = AddRoute