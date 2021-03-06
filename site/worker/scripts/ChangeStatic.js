const fs = require('fs')
const Redis = require('../../../_common/Redis.js')
const Settings = require('../../../_common/Settings.js')
const sha1 = require('sha1')
const zlib = require('zlib')

class ChangeStatic {
	constructor(onError, log) { 
		this.onError = onError
		this.log = log
		this.label = this.constructor.name
		this.routeTable = Settings.staticRouteTable()
		this.added = {}
		
		this.redis = new Redis(this.onError)
	}
	
	async add(fileString) {
		try {
			let answer = false
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
							if (!this.added[clientsPath]) {
								answer = await this._work(clientsPath, fileString)
								this.added[clientsPath] = true
							}
						}
					}
				}
			}
			return answer
		} catch (error) {
			this.onError(this.label, 'add', error)
		}
	}
	
	async _work(clientsPath, fileString) {
		try {
			let result = false
			let stats = fs.statSync(fileString)
			if (!stats.isDirectory()) {
				let fileProperties = {
					fileString,
					size: stats.size,
					lastModified: stats.mtime.toUTCString()
				}
				let gzip = false
				let fileFits = this._isFit(fileString, stats.size)
				if (fileFits) {
					let file = fs.readFileSync(fileString)
					let eTag = sha1(file.toString())
					fileProperties.eTag = eTag
					gzip = zlib.gzipSync(file)
					fileProperties.gzip = !!gzip
				}
				let isInLibrary = (/libraries/).test(fileString)
				if (isInLibrary || (!isInLibrary && !this._isCode(fileString))) {
					fileProperties.ttl = Settings.staticTtl
				}
				await this._addToRedis(clientsPath, fileProperties, gzip)
				return clientsPath
			}
		} catch (error) {
			if (!(error && error.code === 'ENOENT')) {
				this.onError(this.label, 'work catch ' + clientsPath, error)
			}
		}
	}
	
	_isFit(fileString, size) {
		let fit = false
		if (this._isCode(fileString)) {
			if (size < Settings.staticSizeLimit * 10) {
				fit = true
			}
		} else {
			if (size < Settings.staticSizeLimit) {
				fit = true
			}
		}
		return fit
	}
	
	_isCode(fileString) {
		let hasRightExtention = (/^.+\.(js|jsx|json|ts|tsx|css|scss|map)$/).test(fileString)
		let isSocketIoDist = fileString.includes('socket.io')
		return (hasRightExtention || isSocketIoDist)
	}
	
	async _addToRedis(fromString, object, gzip) {
		try {
			let commands = []
			let sKey = 'StaticFiles:List'
			commands.push(['sadd', sKey, fromString])
			let hKey = 'StaticFiles:' + fromString
			commands.push(['hmset', hKey, object])
			if (gzip) {
				commands.push(['set', hKey + ':gzip', gzip])
			} else {
				commands.push(['del', hKey + ':gzip'])
			}
			await this.redis.pipe(commands)
		} catch(error) {
			this.onError(this.label, '_addToRedis', error)
		}
	}
}

module.exports = ChangeStatic