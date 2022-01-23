const SetServer = require('./SetServer.js')
const Settings = require('../../../../_common/Settings.js')
const SiteSections = require('./SiteSections.js')
const Statics = require('../statics/Statics.js')

class Listener {
	constructor(onError, log, currentPath, port, onRequest) {
		this.onError = onError
		this.log = log
		this.currentPath = currentPath
		this.port = port
		this.onRequest = onRequest
		this.label = this.constructor.name
	}
	
	async start() {
		try {
			this.statics = new Statics(this)
			await this.statics.start()
			this.sections = new SiteSections(this)
			await this.sections.getAll()
			this.setServer = new SetServer(this)
			await this.setServer.start()
			this._setOnMessage()
		} catch (error) {
			this.onError(this.label, 'start', error)
		}
	}
	
	onNewFileList(object) {
		this.statics.onNewFileList(object)
	}
	
	onCertificatesChanged(domain) {
		if (this.setServer) {
			this.setServer.recreateServer()
		}
	}
	
	restartSection(host) {
		if (this.sections) {
			let ok = this.sections.restartSection(host)
			if (ok && this.setServer) {
				this.setServer.recreateServer()
				if (this.port === Settings.port) {
					this.log('Http(s) servers have been recreated due to ' + host)
				}
			}
		}
	}
	
	_setOnMessage() {
		process.on('message', message => {
			if (message.label === 'addToCache') {
				this.statics.addToCache(message)
			}
		})
	}
	
	getUrl(request) {
		let url = request.url + ''
			url = url.split('?')[0]
			url = url.split('#')[0]
		if (!url) {
			url = '/'
		}
		return url
	}
	
	getHeaders(request) {
		let hostDomain = false
		let origin = false
		let originDomain = false
		let referer = false
		let refererDomain = false
		let refererUrl = false
		let socketLabel = false
		if (request.rawHeaders && typeof request.rawHeaders === 'object') {
			for (let i = 0; i < request.rawHeaders.length; i++) {
				let stringWithDomain = request.rawHeaders[i + 1]
				let key = (request.rawHeaders[i] + '').toLowerCase()
				if (key === 'host' || key === 'origin') {
					let domain = this.getDomainFromString(stringWithDomain)
					if (key === 'host') {
						hostDomain = domain
					}
					if (key === 'origin') {
						origin = stringWithDomain
						originDomain = domain
					}
				} else if (key === 'referer') {
					referer = stringWithDomain
					refererDomain = this.getDomainFromString(stringWithDomain)
					let refererUrlOrNot = this._getUrlFromString(stringWithDomain)
					if (refererUrlOrNot && refererUrlOrNot.length > 1) {
						refererUrl = refererUrlOrNot
					}
				}
				if (hostDomain && originDomain && referer) {
					break
				}
			}
		}
		if (request.url) {
			socketLabel = this._getLabelFromString(request.url.toString())
		}
		return { hostDomain, originDomain, origin, referer, refererDomain, refererUrl, socketLabel }
	}
	getDomainFromString(string) {
		string = this._getRidOfExtra(string, 'https://', true)
		string = this._getRidOfExtra(string, 'http://', true)
		string = this._getRidOfExtra(string, ':')
		string = this._getRidOfExtra(string, '/')
		string = this._getRidOfExtra(string, '?')
		string = this._getRidOfExtra(string, '#')
		return string
	}
	_getUrlFromString(string) {
		string = this._getRidOfExtra(string, 'https://', true)
		string = this._getRidOfExtra(string, 'http://', true)
		string = this._getRidOfExtra(string, '/', true)
		string = this._getRidOfExtra(string, '?')
		string = this._getRidOfExtra(string, '#')
		string = this._getRidOfExtra(string, '/')
		return '/' + string
	}
	_getLabelFromString(string) {
		string = this._getRidOfExtra(string, '?', true)
		string = this._getRidOfExtra(string, 'label=', true)
		string = this._getRidOfExtra(string, '&')
		string = this._getRidOfExtra(string, '?')
		string = this._getRidOfExtra(string, '#')
		string = this._getRidOfExtra(string, '/')
		return '/' + string
	}
	_getRidOfExtra(string, extra, isPrefix) {
		let array = string.split(extra)
		if (array.length > 1) {
			let i = 0
			if (isPrefix) {
				i = 1
			}
			string = array[i]
		}
		return string
	}
	
	onProxyError(object) {
		let { response, socket, error, url } = object
		if (error && this._isError(error)) {
			if (object.response) {
				object.response.statusCode = error ? 500 : 404
				object.response.write(error ? error.toString() : url + ' is not found')
				object.response.end()
			} else if (object.socket) {
				object.socket.end()
			}
			this.onError(this.label, 'onProxyError, ' + object.method + ', url:' + url, object.error)
		}
	}
	_isError(error) {
		let isError = true
		let errorString = error.toString()
		let chitchat = ['ENOTFOUND', 'ENOENT', 'ECONNREFUSED', 'Host header is missing']
		chitchat.some(idleChunk => {
			if (errorString.includes(idleChunk)) {
				isError = false
			}
		})
		return isError
	}
}

module.exports = Listener