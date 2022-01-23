const cluster = require('cluster')
const http = require('http')
const https = require('https')
const HttpsOptions = require('./HttpsOptions.js')
const PreparedFilesHandler = require('./PreparedFilesHandler.js')
const RequestHandler = require('./RequestHandler.js')
const ResponseHandler = require('./ResponseHandler.js')
const SiteSections = require('./SiteSections.js')
const Settings = require('../../../_common/Settings.js')

class Server {
	constructor(onError, log, port, rabbitMQ) {
		this.onError = onError
		this.log = log
		this.port = port
		this.rabbitMQ = rabbitMQ
		this.label = this.constructor.name + ':' + this.port
		this._server = false
		this._statusCodeOk = 200
	}
	
	async start(onRequest) {
		this._onRequest = onRequest
		try {
			this._preparedFilesHandler = new PreparedFilesHandler(this.onError, this.rabbitMQ)
			await this._preparedFilesHandler.start()
			this.siteSections = new SiteSections(this.onError)
			await this.siteSections.start()
			this._createServer()
			if (!cluster.isMaster) {
				process.send({ started: true, port: this.port })
				process.on('message', this._onMessage.bind(this))
			}
		} catch (error) {
			this.onError(this.label, 'start', error)
		}
	}
	
	_createServer() {
		if (this._server) {
			this._server.close()
		}
		let router = this._router.bind(this)
		if (this.port === Settings.portS) {
			let options = new HttpsOptions().get()
			this._server = https.createServer(options, router)
		} else {
			this._server = http.createServer(router)
		}
		this._server.on('upgrade', this._serverOnUpgrade.bind(this))
		this._server.on('error', error => {
			this.onError(this.label, '_createServer ' + this.port, error)
		})
		this._server.listen(this.port)
	}
	
	_router(request, response) {
		if (cluster.isMaster) {
			this._onRequest(this.port)
		} else {
			process.send({ onRequest: this.port })
		}
		
		if (this.port !== Settings.port) {
			this._not80handler(request, response)
		} else {
			this._80handler(request, response)
		}
	}
	
	async _not80handler(request, response) {
		let requestHandler = new RequestHandler(request)
		let responseHandler = new ResponseHandler(response, this.onError)
		try {
			let sentType = await this._preparedFilesHandler.tryToSend(request, response)
			if (!sentType) {
				let cleanUrl = requestHandler.getCleanUrl()
				let { proxy, wsProxy } = this.siteSections.getProxies(request)
				if (proxy) {
					if (wsProxy && cleanUrl.includes('socket.io')) {
						if (!cleanUrl.includes('label=chem')) {
							response = responseHandler.tryToSetCors(request)
						}
						wsProxy.web(request, response)
					} else {
						proxy.web(request, response)
					}
				} else {
					if (Settings.nextJsIndexPagesList.includes(cleanUrl)) {
						let indexName = 'index'
						let { hostDomain, originDomain } = requestHandler.getHeaders()
						let eventualDomain = originDomain || hostDomain
						let prefix = Settings.developmentStageName.substring(0, 1)
						if (Settings.productionDomains.includes(eventualDomain)) {
							prefix = Settings.productionStageName.substring(0, 1)
						}
						let host = prefix + '-' + Settings.label + '_' + indexName
						let indexProxy = this.siteSections.hosts[host].proxy
						request.url = '/' + indexName + (cleanUrl === '/' ? '' : requestHandler.url)
						indexProxy.web(request, response)
					} else {
						responseHandler.sendNotFound(requestHandler.url + ' is not found')
					}
				}
			}
		} catch (error) {
			responseHandler.sendError(error)
			this.onError(this.label, '_not80handler ' + requestHandler.url, error)
		}
	}
	
	_80handler(request, response) {
		let requestHandler = new RequestHandler(request)
		let responseHandler = new ResponseHandler(response, this.onError)
		let cleanUrl = requestHandler.getCleanUrl()
		let { hostDomain, originDomain, refererDomain } = requestHandler.getHeaders(request)
		let domain = hostDomain || originDomain || refererDomain
		if (domain) {
			if (cleanUrl.includes(Settings.httpTestPhrase)) {
				responseHandler.sendText(Settings.httpTestPhrase + ' is ok')
			} else if (cleanUrl.includes('.well-known')) {
				if (Settings.domains.includes(domain)) {
					let stage = Settings.productionStageName
					if (Settings.developmentDomains.includes(domain)) {
						stage = Settings.developmentStageName
					}
					let pathToFile = '/usr/nodejs/sda/' + stage + '/letsEncrypt' + cleanUrl
					responseHandler.sendFileByStream(pathToFile)
					this.log('LetsEncrypt has checked ' + domain + ', url: ' + requestHandler.url)
				} else {
					responseHandler.sendNotFound('Domain ' + domain + ' is not in list')
				}
			} else {
				responseHandler.rewriteTo('https://' + domain + requestHandler.url)
			}
		} else {
			responseHandler.sendNotFound('Domain ' + domain + ' is not found')
		}
	}
	
	_serverOnUpgrade(request, socket, head) {
		let { proxy, wsProxy } = this.siteSections.getProxies(request, true)
		if (proxy) {
			let requestHandler = new RequestHandler(request)
			let cleanUrl = requestHandler.getCleanUrl()
			if (wsProxy && cleanUrl.includes('socket.io')) {
				wsProxy.ws(request, socket, head)
			} else {
				proxy.ws(request, socket, head)
			}
		} else {
			socket.end()
		}
	}
	
	_onMessage(message) {
		if (this.port === Settings.portS) {
			this._createServer()
		}
	}
}

module.exports = Server