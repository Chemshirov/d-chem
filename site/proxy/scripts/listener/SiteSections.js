const child_process = require('child_process')
const proxyServer = require('http-proxy')
const Settings = require('../../../../_common/Settings.js')

class SiteSections {
	constructor(parentContext) {
		this.parentContext = parentContext
		this.onError = this.parentContext.onError
		this.label = this.constructor.name
		this.hosts = {}
		this.domainsToHosts = {}
		this.getProxy = this._getProxy.bind(this)
	}
	
	async getAll() {
		try {
			let developmentList = await this._getDirectories(process.env.TILDA + Settings.developmentStageName)
			this._addSections(developmentList)
			let productionList = await this._getDirectories(process.env.TILDA + Settings.productionStageName)
			this._addSections(productionList)
			this._addOldies()
		} catch (error) {
			this.onError(this.label, 'getAll', error)
		}
	}
	
	restartSection(host) {
		let ok = false
		if (this.hosts[host]) {
			let proxy = this._getProxie(host)
			this.hosts[host].proxy = proxy
			ok = true
		}
		return ok
	}
	
	_getProxy(request, isProxy) {
		let url = request.url
		let shortUrl = this.parentContext.getUrl(request)
		let { hostDomain, originDomain, refererUrl, socketLabel } = this.parentContext.getHeaders(request)
		let eventualUrl = shortUrl
		if (socketLabel && refererUrl && typeof url === 'string' && url.includes('socket.io')) {
			eventualUrl = refererUrl
		}
		let eventualDomain = originDomain || hostDomain
		let host = this._getHostByUrlAndDomain(url, eventualUrl, eventualDomain, request)
		if (isProxy) {
			host = this._getHostByUrlAndDomain(url, socketLabel, eventualDomain, request)
		}
		if (host) {
			return this.hosts[host].proxy
		}
	}
	
	_getHostByUrlAndDomain(url, urlLabel, domain, request) {
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
				
				let prefix = Settings.developmentStageName.charAt(0)
				let domains = Settings.developmentDomains
				if (path.includes(Settings.productionStageName)) {
					prefix = Settings.productionStageName.charAt(0)
					domains = Settings.productionDomains
				}
				let host = prefix + '-' + process.env.LABEL + '_' + name
				
				let proxy = this._getProxie(host)
				this.hosts[host] = { domains, proxy }
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
	
	_getProxie(host, port) {
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
		proxy.on('error', (error, request, response) => {
			if (!(typeof error && error.code === 'ECONNRESET')) {
				let url = this.parentContext.getUrl(request)
				this.parentContext.onProxyError({ method: '_getProxie', response, error, url })
			}
		})
		let proxyForWebsockets = this._getProxyForWebsockets(host, port)
		proxy.forWebsockets = proxyForWebsockets
		return proxy
	}
	
	_getProxyForWebsockets(host, port) {
		let proxyForWebsockets = false
		let isNextJs = false
		Settings.nextJsList.forEach(name => {
			if (host.endsWith('_' + name)) {
				isNextJs = true
			}
		})
		if (isNextJs && !port) {
			let stage = Settings.stageByContainerName(host)
			let port = Settings.nextJsWebsocketPortByStage(stage)
			if (port) {
				proxyForWebsockets = this._getProxie(host, port)
			}
		}
		return proxyForWebsockets
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
		this._addMarker('chem-node', '/') //
	}
	
	_addOldie(host, domains) {
		this._addDomains(domains, host)
		let proxy = this._getProxie(host)
		this.hosts[host] = { domains, proxy }
		this._addMarker(host, 'label=chem')
		this._addMarker(host, '/data')
		this._addMarker(host, '/mosaic')
		this._addMarker(host, '/chem') //
	}
}

module.exports = SiteSections