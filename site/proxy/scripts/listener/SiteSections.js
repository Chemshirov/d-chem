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
		let url = this.parentContext.getUrl(request)
		let { hostDomain, originDomain, refererUrl, socketLabel } = this.parentContext.getHeaders(request)
		let eventualUrl = refererUrl || url
		let eventualDomain = originDomain || hostDomain
		let host = this._getHostByUrlAndDomain(eventualUrl, eventualDomain)
		if (isProxy) {
			host = this._getHostByUrlAndDomain(socketLabel, eventualDomain)
		}
		if (host) {
			return this.hosts[host].proxy
		}
	}
	
	_getHostByUrlAndDomain(url, domain) {
		let result = false
		if (domain) {
			let hosts = this.domainsToHosts[domain]
			if (hosts) {
				hosts.some(host => {
					let urlMarkers = this.hosts[host].urlMarkers
					if (urlMarkers) {
						return urlMarkers.some(marker => {
							if (url === marker || url.startsWith(marker)) {
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
			// proxyTimeout: Settings.standardTimeout,
			// timeout: Settings.standardTimeout * 3, // stops mp4 playing if removed
			followRedirects: true,
		}
		if (host === 'd-site_logs') {
			delete options.proxyTimeout
			delete options.timeout
		}
		let proxy = proxyServer.createProxyServer(options)
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
		let isLogs = host.endsWith(process.env.LABEL + '_logs')
		if (isLogs && !port) {
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
	}
	
	_addOldie(host, domains) {
		this._addDomains(domains, host)
		let proxy = this._getProxie(host)
		this.hosts[host] = { domains, proxy }
		this._addMarker(host, '/data')
		this._addMarker(host, '/')
		this._addMarker(host, '/chem')
	}
}

module.exports = SiteSections