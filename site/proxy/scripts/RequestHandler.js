const Settings = require('../../../_common/Settings.js')

class RequestHandler {
	constructor(request) {
		this._request = request
		this.method = this._getMethod()
		this.url = this._getUrl()
	}
	
	_getMethod() {
		return this._request.method + ''
	}
	
	_getUrl() {
		let url = this._request.url + ''
		if (!url) {
			url = '/'
		}
		return url
	}
	
	getCleanUrl() {
		let url = this.url
		try {
			url = decodeURI(this.url)
		} catch (e) {}
		url = this._getRidOfExtra(url, '?')
		url = this._getRidOfExtra(url, '#')
		if (url.startsWith('/audiobooks')) {
			let regExp = /^(\/[^\/]+\/[^\/]+\/)([^\/]+)\/([^\/]+)\/([^\/]+\.mp3)$/
			let path = url.replace(regExp, '$1')
			let author = url.replace(regExp, '$2')
			let name = url.replace(regExp, '$3')
			let file = url.replace(regExp, '$4')
			url = path + author + ' - ' + name + '/' + file
		}
		url = url.replace(/__hash__/g, '#')
		return url
	}
	
	get isUpgrade() {
		return !!this._request.upgrade
	}
	
	get isNextJsDev() {
		let url = this.url
		if (url.includes('_next') && url.includes('?ts=')) {
			return true
		} else {
			return false
		}
	}
	
	get isMethodHead() {
		return (this.method === 'HEAD')
	}
	
	get stage() {
		let { hostDomain, originDomain, refererDomain } = this.getHeaders()
		let eventualDomain = hostDomain || originDomain || refererDomain
		let stage = Settings.productionStageName
		if (Settings.developmentDomains.includes(eventualDomain)) {
			stage = Settings.developmentStageName
		}
		return stage
	}
	
	get fileExtention() {
		let cleanUrl = this.getCleanUrl()
		let reverseUrl = cleanUrl.split('').reverse().join('')
		let revertedExt = reverseUrl.split('.')[0]
		let ext = revertedExt.split('').reverse().join('')
		return ext
	}
	
	get mimeType() {
		let ext = '.' + this.fileExtention
		let type = 'text/plain'
		let knownType = Settings.staticMimeTypes[ext]
		if (knownType) {
			type = knownType
		}
		return type
	}
	
	getEncoder() {
		let acceptEncoding = ''
		if (this._request && this._request.headers && this._request.headers['accept-encoding']) {
			acceptEncoding = this._request.headers['accept-encoding'] + ''
		}
		let mayGzip = this._getMayEncoder(acceptEncoding, 'gzip')
		let mayDeflate = this._getMayEncoder(acceptEncoding, 'deflate')
		return mayGzip || mayDeflate
	}
	
	get range() {
		let start = null
		let end = null
		if (this._request && this._request.headers && this._request.headers['range']) {
			let rangeHeader = (this._request.headers['range'] + '')
			if (rangeHeader.startsWith('bytes=') && rangeHeader.includes('-')) {
				let positions = rangeHeader.substring(6).split('-')
				let maybeStart = +positions[0]
				if (typeof maybeStart === 'number') {
					start = maybeStart
				}
				let maybeEnd = +positions[1]
				if (typeof maybeEnd === 'number') {
					end = maybeEnd
				}
			}
		}
		return { start, end }
	}
	
	_getMayEncoder(acceptEncoding, encoder) {
		let length = acceptEncoding.split(encoder).length
		if (length > 1) {
			return encoder
		}
	}
	
	getHeaders() {
		let hostDomain, origin, originDomain, referer, refererDomain, refererUrl, socketLabel
		if (this._request.rawHeaders && typeof this._request.rawHeaders === 'object') {
			for (let i = 0; i < this._request.rawHeaders.length; i++) {
				let stringWithDomain = this._request.rawHeaders[i + 1]
				let key = (this._request.rawHeaders[i] + '').toLowerCase()
				if (key === 'host' || key === 'origin') {
					let domain = this._domainFromString(stringWithDomain)
					if (key === 'host') {
						hostDomain = domain
					}
					if (key === 'origin') {
						origin = stringWithDomain
						originDomain = domain
					}
				} else if (key === 'referer') {
					referer = stringWithDomain
					refererDomain = this._domainFromString(stringWithDomain)
					let refererUrlOrNot = this._urlFromString(stringWithDomain)
					if (refererUrlOrNot && refererUrlOrNot.length > 1) {
						refererUrl = refererUrlOrNot
					}
				}
				if (hostDomain && originDomain && referer) {
					break
				}
			}
		}
		if (this._request.url) {
			socketLabel = this._labelFromString(this._request.url.toString())
		}
		return { hostDomain, origin, originDomain, referer, refererDomain, refererUrl, socketLabel }
	}
	
	_domainFromString(string) {
		let newString = string
		newString = this._getRidOfExtra(newString, 'https://', true)
		newString = this._getRidOfExtra(newString, 'http://', true)
		newString = this._getRidOfExtra(newString, ':')
		newString = this._getRidOfExtra(newString, '/')
		newString = this._getRidOfExtra(newString, '?')
		newString = this._getRidOfExtra(newString, '#')
		return newString
	}
	
	_urlFromString(string) {
		let newString = string
		newString = this._getRidOfExtra(newString, 'https://', true)
		newString = this._getRidOfExtra(newString, 'http://', true)
		newString = this._getRidOfExtra(newString, '/', true)
		newString = this._getRidOfExtra(newString, '?')
		newString = this._getRidOfExtra(newString, '#')
		newString = this._getRidOfExtra(newString, '/')
		return '/' + newString
	}
	
	_labelFromString(string) {
		let newString = string
		newString = this._getRidOfExtra(newString, '?', true)
		newString = this._getRidOfExtra(newString, 'label=', true)
		newString = this._getRidOfExtra(newString, '&')
		newString = this._getRidOfExtra(newString, '?')
		newString = this._getRidOfExtra(newString, '#')
		newString = this._getRidOfExtra(newString, '/')
		return '/' + newString
	}
	
	_getRidOfExtra(string, extra, isPrefix) {
		let newString = string
		let array = newString.split(extra)
		if (array.length > 1) {
			let i = 0
			if (isPrefix) {
				i = 1
			}
			newString = array[i]
		}
		return newString
	}
}

module.exports = RequestHandler