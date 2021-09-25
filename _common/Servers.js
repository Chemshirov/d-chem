const express = require('express')
const compression = require('compression')
const http = require('http')
const https = require('https')
const socketIO = require('socket.io')
const fs = require('fs')
const tls = require('tls')

const Settings = require('./Settings.js')

class Servers {
	constructor(ports, onError) {
		this.ports = ports
		this._onError = onError
		this.label = this.constructor.name
	}
	
	corsOrigin(origin) {
		if (origin) {
			let shortOrigin = origin.substring(0, 25)
			Settings.domains.some(siteName => {
				if (shortOrigin.includes(siteName)) {
					return origin
				}
			})
		}
	}
	
	startHttp(notWebsocket) {
		return new Promise(success => {
			this.express80 = express()
			this.express80.use(compression())
			this.httpServer = http.createServer(this.express80)
			this.httpServer.on('error', err => {
				this._onError(this.label, 'startHttpAndIo this.httpServer.on', err)
			})
			this.httpServer.listen(this.ports[0])
			
			if (this.ports[1]) {
				this.express443 = express()
				this.express443.use(compression())
				let credentials = this._getHttpsCredentials()
				this.httpsServer = https.createServer(credentials, this.express443)
				this.httpsServer.on('error', err => {
					this._onError(this.label, 'startHttpAndIo this.httpsServer.on', err)
				})
				this.httpsServer.listen(this.ports[1])
			}
			
			if (!notWebsocket) {
				let server = (this.httpsServer || this.httpServer)
				this.websockets = socketIO(server, {
					maxHttpBufferSize: Settings.socketMaxBufferSize,
					cors: {
						origin: (origin, callback) => {
							if (this.corsOrigin(origin)) {
								callback(null, true)
							} else {
								callback(null)
							}
						},
						methods: ['GET', 'POST', 'OPTIONS'],
						credentials: true,
					}
				})
			}
			success()
		}).catch(err => {
			this._onError(this.label, '_startHttpAndIo', err)
		})
	}
	
	setRouter(routeFunction) {
		this._routeFunction = routeFunction
		if (this.express443) {
			this.express80.all('*', this._httpOnlyRoutes.bind(this))
			this.express443.all('*', this._setRoutes.bind(this))
		} else {
			this.express80.all('*', this._setRoutes.bind(this))
		}
	}
	
	getCookies(req) {
		let cookies = {}
		let cookieString = req.headers.cookie + ''
		let rawCookies = cookieString.split(';')
			rawCookies.forEach(e => {
				let cookieName = e.replace(/^([^=]+)=(.+)/, '$1').trim()
				let cookieBody = e.replace(/^([^=]+)=(.+)/, '$2').trim()
				cookies[cookieName] = cookieBody
			})
		return cookies
	}
	
	_setRoutes(req, res) {
		let url = req.originalUrl + ''
		this._cors(req, res)
		
		let sendFile = this._routeFunction(url, req, res)
		
		if (sendFile) {
			let badRequestStatusCode = 400
			try {
				sendFile = decodeURIComponent(sendFile)
			} catch(e) {
				res.statusCode = badRequestStatusCode
				res.end('Bad Request')
				return
			}
			if (~sendFile.indexOf('\0')) {
				res.statusCode = badRequestStatusCode
				res.end('Bad Request')
				return
			}
			fs.stat(sendFile, (err, stats) => {
				if (err || !stats.isFile()) {
					res.statusCode = badRequestStatusCode
					res.set({'Content-Type': 'text/html; charset=utf-8'})
					res.end(err.toString())
				} else {
					res.sendFile(sendFile)
				}
			})
		}
	}
	
	_httpOnlyRoutes(req, res) {
		let url = req.originalUrl + ''
		
		this._cors(req, res)
		
		if ((/.*testtest.*/).test(url)) {
			res.send('Test: ok')
		} else if ((/^\/\.well-known/).test(url)) {
			// this.Syncer.letsEncryptOnTwoServers(url, res)
		} else {
			res.redirect('https://' + req.headers.host + req.url)
		}
	}
	
	_cors(req, res) {
		if (req.headers && req.headers.origin) {
			let origin = this.corsOrigin(req.headers.origin)
			if (origin) {
				res.setHeader('Access-Control-Allow-Origin', origin)
			}
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
				
				let certs = this.domains[clearDomain]
				if (!certs) {
					let firstDomain = Object.keys(this.domains)[0]
					certs = this.domains[firstDomain]
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
				ca: fs.readFileSync(path + 'chain.pem', 'utf8'),
			})
		} catch(err) {
			this._onError(this.label, '_getCertificate try', err)
		}
		return certs
	}
}

module.exports = Servers