const cluster = require('cluster')
const cpuAmount = require('os').cpus().length
const fs = require('fs')
const http = require('http')
const https = require('https')
const proxyServer = require('http-proxy')
const Settings = require('../../_common/Settings.js')
const Starter = require('../../_common/Starter.js')
const tls = require('tls')

class Listener extends Starter {
	constructor() { 
		super()
		this.label = this.constructor.name
	}
	
	async atStart() {
		try {
			if (cluster.isPrimary) {
				for (let i = 0; i < cpuAmount; i++) {
					cluster.fork()
				}
				cluster.on('exit', (worker, code, signal) => {
					cluster.fork()
				})
			} else {
				this._setProxies()
				
				let httpServer = http.createServer((request, response) => {
					this._preRouter({request, response})
				})
				httpServer.on('upgrade', (request, socket, head) => {
					this._preRouter({request, socket, head})
				})
				httpServer.listen(Settings.port)
				
				let httpsServer = https.createServer(this._getHttpsCredentials(), (request, response) => {
					this._preRouter({request, response, https: true})
				})
				httpsServer.on('upgrade', (request, socket, head) => {
					this._preRouter({request, socket, head, https: true})
				})
				httpsServer.listen(Settings.portS)
			}
		} catch (err) {
			this.onError(this.label, 'atStart', err)
		}
	}
	
	_setProxies() {
		this.proxies = {}
		Settings.domains.forEach(domain => {
			let options = this._getProxyOptions(domain)
			this.proxies[domain] = proxyServer.createProxyServer(options)
		})
		this.proxies['old'] = proxyServer.createProxyServer(this._proxyOldOptions())
		this.proxies['oldD'] = proxyServer.createProxyServer(this._proxyOldOptions(true))
	}
	
	_getProxyOptions(domain) {
		let isDevelopmentDomainFits = Settings.developmentDomains.includes(domain)
		let prefixLetter = Settings.productionStageName.substring(0, 1)
		if (isDevelopmentDomainFits) {
			prefixLetter = Settings.developmentStageName.substring(0, 1)
		}
		let prefix = prefixLetter + '-'
		let host = prefix + process.env.LABEL + '_onrequest'
		let options = {
			target: {
				host,
				port: Settings.port
			},
			ws: true
		}
		return options
	}
	
	_preRouter(object) {
		let { request, response, socket, head, https } = object
		if (https) {
			let { hostDomain, originDomain, origin } = this._getDomains(request)
			let domain = originDomain || hostDomain
			if (this.proxies[domain]) {
				if (origin && hostDomain !== originDomain) {
					let old = 'old'
					let isDevelopmentDomainFits = Settings.developmentDomains.includes(originDomain)
					if (isDevelopmentDomainFits) {
						old += 'D'
					}
					if (response) {
						this.proxies[old].web(request, response)
					} else {
						this.proxies[old].ws(request, socket, head)
					}
				} else {
					if (response) {
						this.proxies[domain].web(request, response)
					} else {
						this.proxies[domain].ws(request, socket, head)
					}
				}
			} else {
				response.statusCode = 400
				response.setHeader('Content-Type', 'text/html; charset=utf-8')
				response.end('Domain is not found.')
			}
		} else {
			let statusCode = 200
			let shortUrl = (request.url + '').substring(0, 12)
			if (shortUrl.includes(Settings.httpTestPhrase)) {
				response.statusCode = statusCode
				response.setHeader('Content-Type', 'text/html; charset=utf-8')
				response.end(Settings.httpTestPhrase + ' is ok')
			} else if (shortUrl.includes('.well-known')) {
				try {
					let fileString = '/usr/nodejs/sda/letsEncrypt' + request.url
					let fileProps = fs.statSync(fileString)
					response.statusCode = statusCode
					response.setHeader('Content-Length', fileProps.size)
					let readStream = fs.createReadStream(fileString)
					readStream.pipe(response)
				} catch(err) {
					response.statusCode = statusCode
					response.setHeader('Content-Type', 'text/html; charset=utf-8')
					response.end(request.url)
				}
			} else {
				let { hostDomain } = this._getDomains(request)
				response.writeHead(302, {'Location': 'https://' + hostDomain + request.url})
				response.end()
			}
		}
	}
	
	_getDomains(request) {
		if (request.rawHeaders && typeof request.rawHeaders === 'object') {
			let hostDomain = ''
			let origin = ''
			let originDomain = ''
			for (let i = 0; i < request.rawHeaders.length; i++) {
				let key = (request.rawHeaders[i] + '').toLowerCase()
				if (key === 'host' || key === 'origin') {
					let stringWithDomain = request.rawHeaders[i + 1]
					let domain = this._getDomainFromString(stringWithDomain)
					if (key === 'host') {
						hostDomain = domain
					}
					if (key === 'origin') {
						origin = stringWithDomain
						originDomain = domain
					}
				}
				if (hostDomain && originDomain) {
					return { hostDomain, originDomain, origin }
				}
			}
			return { hostDomain, originDomain, origin }
		}
	}
	_getDomainFromString(string) {
		string = this._getRidOfExtra(string, 'https://', true)
		string = this._getRidOfExtra(string, 'http://', true)
		string = this._getRidOfExtra(string, ':')
		string = this._getRidOfExtra(string, '/')
		string = this._getRidOfExtra(string, '?')
		string = this._getRidOfExtra(string, '#')
		return string
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
	
	_getHttpsCredentials() {
		let certsObject = this._getCertificates()
		let credentials = {
			SNICallback: (domain, cb) => {
				let clearDomain = domain
				Settings.domains.forEach(ownDomain => {
					let regExp = new RegExp('^.*(' + ownDomain + ').*')
					if ((regExp).test(domain)) {
						clearDomain = domain.replace(regExp, '$1')
					}
				})
				
				let certs = certsObject[clearDomain]
				if (!certs) {
					let firstDomain = Object.keys(certsObject)[0]
					certs = certsObject[firstDomain]
				}
				
				if (cb) {
					cb(null, certs)
				} else {
					return certs
				}
			}
		}
		return credentials
	}
	
	_getCertificates() {
		let domains = {}
		Settings.domains.forEach(domain => {
			let cert = this._getCertificate(domain)
			if (cert) {
				domains[domain] = cert
			}
		})
		return domains
	}
	
	_getCertificate(domain) {
		let certs = false
		let path = '/usr/nodejs/le/' + domain + '/'
		try {
			certs = tls.createSecureContext({
				key: fs.readFileSync(path + 'privkey.pem', 'utf8'),
				cert: fs.readFileSync(path + 'cert.pem', 'utf8'),
				ca: fs.readFileSync(path + 'chain.pem', 'utf8')
			})
		} catch(err) { }
		return certs
	}
	
	_proxyOldOptions(isDevelopment) {
		let protocol = 'http://'
		let host = 'chem-node'
		if (isDevelopment) {
			host = 'chem-dev'
		}
		return {
			target: {
				protocol,
				host,
				port: Settings.port
			},
			ws: true
		}
	}
}

module.exports = Listener