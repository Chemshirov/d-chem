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
			this.proxies[domain] = proxyServer.createProxyServer(this._getProxyOptions(domain))
		})
	}
	
	_getProxyOptions(domain) {
		let options = {}
		if (!this._typeProxyOptionsObject) {
			this._typeProxyOptionsObject = {}
		}
		if (this._typeProxyOptionsObject[domain]) {
			options = this._typeProxyOptionsObject[domain]
		} else {
			let host = 'chem-node'
			if (Settings.developmentDomains.includes(domain)) {
				host = process.env.PREFIX + process.env.LABEL + '_onrequest'
			}
			let target = {
				host,
				port: Settings.port
			}
			options = { target, ws: true }
			this._typeProxyOptionsObject[domain] = options
		}
		return options
	}
	
	_preRouter(object) {
		let {request, response, socket, head, https} = object
		if (https) {
			let {request, response, socket, head} = object
			let domain = this._getDomain(request)
			if (this.proxies[domain]) {
				if (response) {
					this.proxies[domain].web(request, response)
				} else {
					this.proxies[domain].ws(request, socket, head)
				}
			}
		} else {
			let statusCode = 200
			let shortUrl = (request.url + '').substring(0, 12)
			if (shortUrl.includes('testtest')) {
				response.statusCode = statusCode
				response.setHeader('Content-Type', 'text/html; charset=utf-8')
				response.end('Ok.')
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
				let domain = this._getDomain(request)
				response.writeHead(302, {'Location': 'https://' + domain + request.url})
				response.end()
			}
		}
	}
	
	_getDomain(request) {
		if (request.rawHeaders && typeof request.rawHeaders === 'object') {
			for (let i = 0; i < request.rawHeaders.length; i++) {
				let key = request.rawHeaders[i]
				if (key === 'Host') {
					let domainWithPort = request.rawHeaders[i + 1]
					let domain = domainWithPort.split(':')[0]
					return domain
				}
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
}

module.exports = Listener