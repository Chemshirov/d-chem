const http = require('http')
const proxyServer = require('http-proxy')
const RabbitMQ = require('../../_common/RabbitMQ.js')
const Redis = require('ioredis')
const Servers = require('../../_common/Servers.js')
const Settings = require('../../_common/Settings.js')
const Statistics = require('../../_common/Statistics.js')

const StaticGetter = require('./StaticGetter.js')
const WebSockets = require('./WebSockets.js')

class Router {
	constructor() {
		this.label = this.constructor.name
		
		this.rabbitMQ = new RabbitMQ(this._onError.bind(this), this._rabbitMQreceive.bind(this))
		this.redis = new Redis({ host: process.env.PREFIX + 'redis' })
		this.statistics = new Statistics(this._onError.bind(this), this.rabbitMQ)
		
		this._start()
	}
	
	_start() {
		this.rabbitMQ.connect().then(async () => {
			if (process.env.TYPE === 'S') {
				this.staticGetter = new StaticGetter(this._onError.bind(this))
				http.createServer(this.staticGetter.sendFile.bind(this.staticGetter)).listen(Settings.port)
			} else {
				this.subsections = await this._getSubsections()
				this._setCredentials()
				
				let isWebsocketType = (process.env.TYPE === 'W')
				this.servers = new Servers([Settings.port], this._onError.bind(this))
				this.servers.startHttp(isWebsocketType ? false : true)
				
				if (isWebsocketType) {
					let webSockets = new WebSockets(this._onError, this._credentials, this.oldHostName)
					webSockets.start(this.servers.websockets)
				} else {
					this.proxy = proxyServer.createProxyServer()
					this.proxy.on('error', err => {})
					this.servers.setRouter(this._routes.bind(this))
				}
			}
			
			this.rabbitMQ.send('dockerrun_started', {
				type: 'started',
				path: process.env.AFTER_TILDA
			})
			this.statistics.started()
		})
	}
	
	_routes(url, request, response) {
		if ((this.subsections.regexp).test(url)) {
			let options = this._proxyOptions(url)
			if (options) {
				this.proxy.web(request, response, options)
			} else {
				response.send('Subsection error. ' + url)
			}
		} else {
			this.proxy.web(request, response, this._proxyOldOptions)
		}
	}
	
	async _getSubsections() {
		try {
			let subsections = {
				data: {},
				regexp: /.*/
			}
			let names = []
			let sKey = 'Containers'
			let containersArray = await this.redis.smembers(sKey)
			if (containersArray) {
				for (let i = 0; i < containersArray.length; i++) {
					let hostname = containersArray[i]
					let hKey = sKey + ':' + hostname
					let containerData = await this.redis.hgetall(hKey)
					if ((/subsections/).test(containerData.path)) {
						names.push(containerData.name)
						subsections.data[containerData.name] = {
							hostname: containerData.hostname
						}
					}
				}
			}
			let regexp = new RegExp("^(\/)?(" + names.join("|") + ")([^0-9a-z_\-])?.*$", "i")
			subsections.regexp = regexp
			return subsections
		} catch(err) {
			this._onError(this.label, '_getSubsections', err)
		}
	}
	
	_setCredentials() {
		try {
			this._credentials = {}
			for (let i = 0; i < Object.keys(this.subsections.data).length; i++) {
				let subsection = Object.keys(this.subsections.data)[i]
				let {hostname, port} = this._getSubsectionCredentials(subsection)
				let host = 'http://' + hostname + ':' + port
				this._credentials[subsection] = {hostname, port, host}
			}
			let {hostname, port, host} = this._getOldCredentials()
			this._credentials[hostname] = {hostname, port, host}
		} catch(err) {
			this._onError(this.label, '_setCredentials', err)
		}
	}
	
	_getSubsectionCredentials(subsection) {
		let hostname = false
		let subSectionObject = this.subsections.data[subsection]
		if (subSectionObject) {
			hostname = subSectionObject.hostname
		}
		return { hostname, port: Settings.port }
	}
	
	_getOldCredentials() {
		let oldCredentialsObject = this._proxyOldOptions.target
		let oldHostProtocol = oldCredentialsObject.protocol
		this.oldHostName = oldCredentialsObject.host
		let oldHostPort = oldCredentialsObject.port
		let oldHost = oldHostProtocol + this.oldHostName + ':' + oldHostPort
		return {
			hostname: this.oldHostName, 
			port: oldHostPort,
			host: oldHost
		}
	}
	
	_proxyOptions(url) {
		let subsection = url.replace(this.subsections.regexp, '$2')
		let {hostname, port} = this._getSubsectionCredentials(subsection)
		return {
			target: {hostname, port}
		}
	}
	get _proxyOldOptions() {
		let protocol = 'https://'
		let host = process.env.LABEL
		let port = 443
		if (process.env.STAGE === 'development') {
			host = process.env.LABEL + '-dev'
			protocol = 'http://'
			port = 80
		}
		return {
			target: {
				protocol,
				host,
				port
			}
		}
	}
	
	_rabbitMQreceive(object, onDone) {
		onDone(true)
	}
	
	_onError(className, method, error) {
		this.rabbitMQ.send('logger', {type: 'error', className, method, error})
	}
}

module.exports = Router