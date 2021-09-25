const SetServer = require('./SetServer.js')
const SiteSections = require('./SiteSections.js')
const Statics = require('../statics/Statics.js')
const WorkerThreadSetter = require('../../../../_common/WorkerThreadSetter.js')

class ListenerWorker extends WorkerThreadSetter {
	constructor() {
		super()
		this.label = this.constructor.name
	}
	
	async start(object) {
		try {
			this.statics = new Statics(this)
			await this.statics.start()
			this.sections = new SiteSections(this)
			await this.sections.getAll()
		} catch (error) {
			this.onError(this.label, 'start', error)
		}
	}
	
	async createServer(object) {
		try {
			this.setServer = new SetServer(this)
			await this.setServer.start(object)
		} catch (error) {
			this.onError(this.label, 'createServer', error)
		}
	}
	
	onNewFileList(object) {
		if (this.statics) {
			this.statics.onNewFileList(object)
		}
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
					refererUrl = this._getUrlFromString(stringWithDomain)
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
				object.response.setHeader('Content-Type', 'text/html; charset=utf-8')
				object.response.write(error ? error.toString() : url + ' is not found')
				object.response.end()
			} else if (object.socket) {
				object.socket.end()
			}
			this.onError(this.label, '_onError, url:' + url, object.error)
		} else {
			this.restart()
		}
	}
	_isError(error) {
		let isError = true
		let errorString = error.toString()
		let chitchat = ['ENOTFOUND', 'ECONNREFUSED', 'Host header is missing']
		chitchat.some(idleChunk => {
			if (errorString.includes(idleChunk)) {
				isError = false
			}
		})
		return isError
	}
}

new ListenerWorker()