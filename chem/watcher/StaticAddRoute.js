const fs = require('fs')
const Redis = require('ioredis')
const sha1 = require('sha1')
const zlib = require('zlib')

const Settings = require('../../_common/Settings.js')

class AddRoute {
	constructor(onError) {
		this.label = this.constructor.name
		this.redis = new Redis({ host: process.env.PREFIX + 'redis' })
	}
	
	work(clientsPath, fileString) {
		return new Promise(async success => {
			let stat = fs.statSync(fileString)
			let object = {
				fileString,
				size: stat.size,
				lastModified: stat.mtime.toUTCString()
			}
			let gzip = false
			if (stat.size < Settings.staticSizeLimit) {
				let file = fs.readFileSync(fileString)
				let eTag = sha1(file.toString())
				object.eTag = eTag
				gzip = zlib.gzipSync(file)
				object.gzip = true
			}
			let longTTl01if = (/libraries/).test(fileString)
			let longTTl02if = !(/\.(js|jsx|ts|css)/).test(fileString)
			if (longTTl01if || longTTl02if) {
				object.ttl = Settings.staticTtl
			}
			await this._addToRedis(clientsPath, object, gzip)
			success()
		}).catch(err => {
			this._onError(this.label, 'addRoute', err)
		})
	}
	
	async _addToRedis(fromString, object, gzip) {
		let key = 'StaticFiles:' + fromString
		await this.redis.hmset(key, object)
		if (gzip) {
			await this.redis.set(key + ':gzip', gzip)
		}
	}
}

module.exports = AddRoute