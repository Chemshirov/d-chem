const child_process = require('child_process')
const proxyServer = require('http-proxy')
const RequestHandler = require('./RequestHandler.js')
const ResponseHandler = require('./ResponseHandler.js')
const Settings = require('../../../_common/Settings.js')

class SiteSections {
	constructor(onError) {
		this.onError = onError
		this.label = this.constructor.name
		this.hosts = {}
		this.domainsToHosts = {}
	}
	
	async start() {
		try {
			let developmentList = await this._getDirectories(process.env.TILDA + Settings.developmentStageName)
			this._addSections(developmentList)
			let productionList = await this._getDirectories(process.env.TILDA + Settings.productionStageName)
			this._addSections(productionList)
			this._addOldies()
		} catch (error) {
			this.onError(this.label, 'start', error)
		}
	}
	
	restartSection(host) {
		let ok = false
		if (this.hosts[host]) {
			this._addProxy(host)
			this._addWsProxy(host)
			ok = true
		}
		return ok
	}
	
	getProxies(request, isSocket) {
		let proxy, wsProxy
		let requestHandler = new RequestHandler(request)
		let url = requestHandler.url
		let cleanUrl = requestHandler.getCleanUrl()
		let { hostDomain, originDomain, refererUrl, socketLabel } = requestHandler.getHeaders(request)
		let eventualUrl = cleanUrl
		if (socketLabel && refererUrl && typeof url === 'string' && url.includes('socket.io')) {
			eventualUrl = refererUrl
		}
		let eventualDomain = originDomain || hostDomain
		let host = this._getHostByUrlAndDomain(url, (isSocket ? socketLabel : eventualUrl), eventualDomain)
		if (host) {
			proxy = this.hosts[host].proxy
			wsProxy = this.hosts[host].wsProxy
		}
		return { proxy, wsProxy }
	}
	
	_getHostByUrlAndDomain(url, urlLabel, domain) {
		let result = false
		if (domain) {
			let hosts = this.domainsToHosts[domain]
			if (hosts) {
				hosts.some(host => {
					let urlMarkers = this.hosts[host].urlMarkers
					if (urlMarkers) {
						return urlMarkers.some(marker => {
							if (urlLabel === marker || url.includes(marker)) {
								result = host
								return true
							}
						})
					}
				})
			}
		}
		return result
	}
	
	_addSections(directories) {
		let markerSectionName = 'subsections'
		directories.forEach(path => {
			if (path.includes(markerSectionName)) {
				let cleanPathOut = new RegExp(/^.+\/([^\/]+)$/)
				let name = path.replace(cleanPathOut, '$1')
				
				let prefix = Settings.developmentStageName.substring(0, 1)
				let domains = Settings.developmentDomains
				if (path.includes(Settings.productionStageName)) {
					prefix = Settings.productionStageName.substring(0, 1)
					domains = Settings.productionDomains
				}
				let host = prefix + '-' + process.env.LABEL + '_' + name
				
				this.hosts[host] = { domains }
				this._addProxy(host)
				this._addWsProxy(host)
				this._addDomains(domains, host)
				this._addMarker(host, '/' + name)
				this._addMarker(host, 'label=' + name)
			}
		})
	}
	
	_addDomains(domains, host) {
		domains.forEach(domain => {
			if (!this.domainsToHosts[domain]) {
				this.domainsToHosts[domain] = []
			}
			this.domainsToHosts[domain].push(host)
		})
	}
	
	_addMarker(host, marker) {
		if (!this.hosts[host].urlMarkers) {
			this.hosts[host].urlMarkers = []
		}
		this.hosts[host].urlMarkers.push(marker)
	}
	
	_getProxy(host, port) {
		let options = {
			target: {
				protocol: 'ws://',
				host: host,
				port: port || Settings.port
			},
			ws: true,
			followRedirects: true,
		}
		let proxy = proxyServer.createProxyServer(options)
			proxy.targetHost = host
			proxy.on('error', this._proxyOnError.bind(this))
		return proxy
	}
	
	_addProxy(host) {
		let proxy = this._getProxy(host)
		this.hosts[host].proxy = proxy
	}
	
	_getWsProxy(host) {
		let proxy = null
		let port = this._portForWsProxy(host)
		if (port) {
			proxy = this._getProxy(host, port)
		}
		return proxy
	}
	
	_addWsProxy(host) {
		let wsProxy = this._getWsProxy(host)
		if (wsProxy) {
			this.hosts[host].wsProxy = wsProxy
		}
	}
	
	_proxyOnError(error, request, response) {
		let responseHandler = new ResponseHandler(response, this.onError)
			responseHandler.sendError(error.toString())
		let isKnownError = false
		if (error && typeof error === 'object') {
			let error1 = (error.code === 'ECONNRESET')
			let error2 = ((error.message + '').includes('ENOTFOUND'))
			if (error1 || error2) {
				isKnownError = true
			}
		}
		if (!isKnownError) {
			let requestHandler = new RequestHandler(request)
			this.onError(this.label, '_proxyOnError ' + requestHandler.url, error)
		}
	}
	
	_portForWsProxy(host) {
		let port = null
		let isNextJs = false
		Settings.nextJsList.forEach(name => {
			if (host.endsWith('_' + name)) {
				isNextJs = true
			}
		})
		if (isNextJs) {
			let stage = Settings.stageByContainerName(host)
			port = Settings.nextJsWebsocketPortByStage(stage)
		}
		return port
	}
	
	_getDirectories(path) {
		return new Promise(success => {
			let markerFileName = 'Dockerfile'
			let cmd = `find ${path} -name 'Dockerfile'`
			child_process.exec(cmd, (error, stdin, stdout) => {
				if (error) {
					this.onError(this.label, '_getDirectories child_process', error)
				} else {
					let result = stdin.toString().trim()
					let cleanMarkerOut = new RegExp('/' + markerFileName, 'g')
					let directoriesString = result.replace(cleanMarkerOut, '')
					let directories = directoriesString.split('\n')
					success(directories)
				}
			})
		}).catch(error => {
			this.onError(this.label, '_getDirectories', error)
		})
	}
	
	_addOldies() {
		this._addOldie('chem-node', Settings.productionDomains)
		this._addOldie('chem-dev', Settings.developmentDomains)
	}
	
	_addOldie(host, domains) {
		this._addDomains(domains, host)
		let proxy = this._getProxy(host)
		this.hosts[host] = { domains, proxy }
		this._addMarker(host, 'label=chem')
		this._addMarker(host, '/data')
		this._addMarker(host, '/mosaic')
	}
}

module.exports = SiteSections