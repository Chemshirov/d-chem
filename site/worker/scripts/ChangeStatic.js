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
		} catch(error) {
			this.onError(this.label, 'add', error)
		}
	}
	
	async _work(clientsPath, fileString) {
		try {
			let result = false
			let stat = fs.statSync(fileString)
			let fileProperties = {
				fileString,
				size: stat.size,
				lastModified: stat.mtime.toUTCString()
			}
			let gzip = false
			let fileFits = this._isFit(fileString, stat.size)
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
		} catch(error) {
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
		return (/^.+\.(js|jsx|json|ts|css)$/).test(fileString)
	}
	
	async _addToRedis(fromString, object, gzip) {
		try {
			let comands = []
			let sKey = 'StaticFiles:List'
			comands.push(['sadd', sKey, fromString])
			let hKey = 'StaticFiles:' + fromString
			comands.push(['hmset', hKey, object])
			if (gzip) {
				comands.push(['set', hKey + ':gzip', gzip])
			}
			await this.redis.pipe(comands)
		} catch(error) {
			this.onError(this.label, '_addToRedis', error)
		}
	}
}

module.exports = ChangeStatic