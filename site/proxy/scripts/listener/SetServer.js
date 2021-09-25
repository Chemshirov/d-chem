const cluster = require('cluster')
const fs = require('fs')
const http = require('http')
const https = require('https')
const proxyServer = require('http-proxy')
const Settings = require('../../../../_common/Settings.js')
const tls = require('tls')

class SetServer {
	constructor(parentContext) {
		this.parentContext = parentContext
		this.onError = this.parentContext.onError
		this.log = this.parentContext.log
		this.port = this.parentContext.port
		this.label = this.constructor.name
	}
	
	async start() {
		try {
			this._createServer()
			if (cluster.isMaster) {
				let message = 'Server started at port ' + this.port
				this.log(message)
			} else {
				process.send({ started: this.port })
			}
		} catch (error) {
			this.onError(this.label, 'start', error)
		}
	}
	
	recreateServer() {
		this._createServer()
	}
	
	_createServer() {
		try {
			if (this.server) {
				this.server.close()
			}
			let serverOnRequest = this._serverOnRequest.bind(this)
			if (this.port === Settings.portS) {
				this.server = https.createServer(this._getHttpsCredentials(), serverOnRequest)
			} else {
				this.server = http.createServer(serverOnRequest)
			}
			this.server.on('upgrade', this._serverOnUpgrade.bind(this))
			this.server.on('error', error => {
				this.onError(this.label, '_createServer, server, ' + this.port, error)
			})
			this.server.listen(this.port)
		} catch (error) {
			this.onError(this.label, 'createServer', error)
		}
	}
	
	_serverOnRequest(request, response) {
		this._router({ request, response })
	}
	
	_serverOnUpgrade(request, socket, head) {
		this._router({ request, socket, head })
	}
	
	async _router(object) {
		try {
			let { request, response, socket, head } = object
			let url = this.parentContext.getUrl(request)
			if (this.port !== Settings.port || socket) {
				if (response) {
					let sent = await this.parentContext.statics.tryTo(url, request, response)
					if (!sent) {
						let proxy = this.parentContext.sections.getProxy(request)
						if (proxy) {
							if (proxy.forWebsockets && url.includes('socket.io')) {
								proxy.forWebsockets.web(request, response)
							} else {
								proxy.web(request, response)
							}
						} else {
							response.statusCode = 404
							response.end()
						}
					}
				} else if (socket) {
					let proxy = this.parentContext.sections.getProxy(request, true)
					if (proxy) {
						if (proxy.forWebsockets && url.includes('socket.io')) {
							proxy.forWebsockets.ws(request, socket, head)
						} else {
							proxy.ws(request, socket, head)
						}
					} else {
						socket.end()
					}
				}
			} else {
				this._http80handler(url, request, response)
			}
		} catch (error) {
			this.parentContext.onProxyError({ method: '_router', error })
		}
	}
	
	_http80handler(url, request, response) {
		let errorHasHappend = false
		let statusCode = 200
		let { hostDomain, originDomain, refererDomain } = this.parentContext.getHeaders(request)
		let eventualDomain = hostDomain || originDomain || refererDomain
		if (eventualDomain) {
			if (url.includes(Settings.httpTestPhrase)) {
				response.statusCode = statusCode
				response.setHeader('Content-Type', 'text/html; charset=utf-8')
				response.end(Settings.httpTestPhrase + ' is ok')
			} else if (url.includes('.well-known')) {
				try {
					let stage = Settings.productionStageName
					if (Settings.developmentDomains.includes(eventualDomain)) {
						stage = Settings.developmentStageName
					}
					let fileString = '/usr/nodejs/sda/' + stage + '/letsEncrypt' + request.url
					this.log('LetsEncrypt ' + eventualDomain, 'fileString: ' + fileString)
					let fileProps = fs.statSync(fileString)
					this.log('LetsEncrypt ' + eventualDomain, 'fileProps.size', fileProps.size)
					response.statusCode = statusCode
					response.setHeader('Content-Length', fileProps.size)
					let readStream = fs.createReadStream(fileString)
					readStream.pipe(response)
				} catch (error) {
					errorHasHappend = error
				}
			} else {
				let rewriteTo = 'https://' + eventualDomain + request.url
				response.writeHead(302, {'Location': rewriteTo})
				response.end()
			}
		} else {
			this.parentContext.onProxyError({ method: '_http80handler', response, errorHasHappend })
		}
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
		} catch (e) {}
		return certs
	}
}

module.exports = SetServer