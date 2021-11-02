class Settings {
	static get mainName() {
		return 'chemshirov'
	}
	static get mainLabel() {
		return 'chem'
	}
	static get topLevelDomainNames() {
		return ['ru', 'com']
	}
	static get productionDomains() {
		return [Settings.mainName + '.ru', Settings.mainName + '.com']
	}
	static get developmentDomains() {
		return ['i8u4.com', 'k3g.ru']
	}
	static get domains() {
		return Settings.productionDomains.concat(Settings.developmentDomains)
	}
	
	
	static get arbiterCheckTimeout() {
		return 1000
	}
	static get arbiterChoosingInterval() {
		return 1000 * 30
	}
	static get arbiterTimeInterval() {
		return 1000 * 15
	}
	static get arbiterTimeSiteList() {
		return ['www.google.com', 'https://www.cloudflare.com/', 'https://www.bbc.com/']
	}
	
	static get connectTimeout() {
		return 500
	}
	
	static getPort(productionPort) {
		let port = productionPort
		if (Settings.stage === Settings.developmentStageName) {
			port++
		}
		return port
	}
	
	static get developmentStageName() {
		return 'development'
	}
	
	static get extraSocketSubsections() {
		return ['logs']
	}
	
	static get filesWatcherDelay() {
		return 200
	}
	static get filesWatcherLimit() {
		return 20
	}
	
	static get httpTestPhrase() {
		return 'testtest'
	}
	
	static get label() {
		return process.env.LABEL || 'site'
	}
	
	static get loggerErrorInterval() {
		return 1000 * 60 * 60
	}
	static get loggerFileName() {
		return '/log.log'
	}
	static get loggerInterval() {
		return 500
	}
	static get loggerLimit() {
		return 1000
	}
	
	static get mysqlPort() {
		return Settings.getPort(43005)
	}
	
	static get mediaCheckInterval() {
		return 1000 * 60 * 15
	}
	
	static get nextJsRevalidateSecs() {
		return 60 * 5
	}
	static get nextJsList() {
		return ['logs', 'multiserver']
	}
	static nextJsWebsocketPortByStage(stage) {
		let port = 43009
		if (stage && stage === Settings.developmentStageName) {
			port++
		}
		return port
	}
	
	static get port() {
		return 80
	}
	static get portS() {
		return 443
	}
	static get portChem() {
		return 43111
	}
	
	static get productionStageName() {
		return 'production'
	}
	
	static get proxyResetTimeout() {
		return 1000 * 15
	}
	static get proxyCacheTtl() {
		return 1000 * 60 * 60 * 24
	}
	
	static get rabbitMqDefaultPort() {
		return 5672
	}
	static get rabbitMqPort() {
		let port = Settings.rabbitPortByStage()
		return Settings.getPort(port)
	}
	static rabbitPortByStage(stage) {
		let port = 43007
		if (stage && stage === Settings.developmentStageName) {
			port++
		}
		return port
	}
	static get rabbitMqTimeout() {
		return 5000
	}
	
	static get redisDefaultPort() {
		return 6379
	}
	static get redisPort() {
		let port = Settings.redisPortByStage()
		return Settings.getPort(port)
	}
	static redisPortByStage(stage) {
		let port = 43003
		if (stage && stage === Settings.developmentStageName) {
			port++
		}
		return port
	}
	static get redisTimeout() {
		return 1000
	}
	
	static get socketMaxBufferSize() {
		return 1e8
	}
	static get socketAwait() {
		return 1000
	}
	static get socketExpires() {
		return 1000 * 60 * 60 * 16
	}
	static get socketReconnectTime() {
		return Settings.standardTimeout * 10
	}
	
	static get stage() {
		return process.env.STAGE || Settings.productionStageName
	}
	
	static stageByContainerName(containerName) {
		let productionFirst = Settings.productionStageName.charAt(0)
		let containerNameFirst = containerName.charAt(0)
		if (productionFirst === containerNameFirst) {
			return Settings.productionStageName
		} else {
			return Settings.developmentStageName
		}
	}
	
	static get standardTimeout() {
		return 1000
	}
	static get standardTryLimit() {
		return 60
	}
	
	static get staticSizeLimit() {
		return 1024 * 1024 / 10
	}
	static get staticTtl() {
		return 60 * 60 * 24 * 7
	}
	static get staticInterval() {
		return 400
	}
	static staticRouteTable() {
		let sda = '/usr/nodejs/sda/'
		let labelPath = process.env.TILDA + Settings.stage + '/' + Settings.label + '/'
		let subsections = labelPath + 'subsections'
		let sdaLabelPath = sda + Settings.stage + '/' + Settings.label + '/'
		let list = {
			[process.env.TILDA + 'libraries/']: ['/libraries/', '/js/'],
			[labelPath + 'clientFiles/']: ['/'],
			[subsections +  '/finance6/www_old/']: ['/finance6/'],
			[subsections +  '/git/www/']: ['/git/'],
			[subsections +  '/logs/.next']: ['/logs/_next'],
			[sdaLabelPath + 'subsections/logs/']: ['/logs/'],
			[sdaLabelPath + 'subsections/data/files/']: ['/data/files/'],
			[sda + 'audiobooks/']: ['/audiobooks/'],
			[sda + 'films/']: ['/films/'],
			[sda + 'music/']: ['/music/'],
		}
		if (Settings.stage === Settings.developmentStageName) {
			list[process.env.TILDA + 'chem_develop/www/data/'] = ['/data/']
			list[process.env.TILDA + 'chem_develop/www/index/'] = ['/index/']
			list[process.env.TILDA + 'chem_develop/www/js/'] = ['/js/']
		} else {
			list[process.env.TILDA + 'chem/https/www/data/'] = ['/data/']
			list[process.env.TILDA + 'chem/https/www/index/'] = ['/index/']
			list[process.env.TILDA + 'chem/https/www/js/'] = ['/js/']
		}
		return list
	}
	static get staticMimeTypes() {
		return {
			'.css': 'text/css; charset=UTF-8',
			'.js': 'application/javascript; charset=UTF-8',
			'.json': 'application/json; charset=UTF-8',
			'.map': 'application/json; charset=UTF-8',
			'.txt': 'text/plain; charset=UTF-8',
			'.html': 'text/html; charset=UTF-8',
			'.ico': 'image/x-icon',
			'.jpg': 'image/jpeg',
			'.jpeg': 'image/jpeg',
			'.png': 'image/png',
			'.gif': 'image/gif',
			'.pdf': 'application/pdf',
			'.epub': 'application/epub+zip',
			'.gzip': 'application/gzip',
			'.mp3': 'audio/mpeg',
			'.mp4': 'video/mp4',
		}
	}
	
	static get statisticsInterval() {
		return 1000
	}
	
	static get timeZone() {
		return 3
	}
	
	static otherContainters(stage) {
		let tree = {}
		let prefix = stage.substring(0, 1) + '-'
		tree['3_services'] = {
			[prefix + 'rabbitmq']: stage + '/rabbitmq/',
			[prefix + 'redis']: stage + '/redis/',
			[prefix + 'mysql']: stage + '/mysql/',
		}
		tree['4_secondary'] = {
			['certbot']: false
		}
		if (stage === Settings.developmentStageName) {
			tree['5_old'] = {
				'chem-dev': 'chem-dev/',
			}
		} else {
			tree['5_old'] = {
				'chem-node': 'chem-node/',
				'chem-bind': 'bind/',
				'chem-mysql': 'mysql/',
				browser: 'browser/',
				git: 'git/',
				redis: 'redis/',
				'psql_postgres_1': 'psql/',
			}
		}
		
		let object = {}
		Object.keys(tree).forEach(type => {
			Object.keys(tree[type]).forEach(hostname => {
				object[hostname] = {
					type,
					path: tree[type][hostname]
				}
			})
		})
		
		return { tree, object }
	}
	
	static watcherMemoryLimitForContainerName(containerName) {
		let limit = Settings.watcherMemoryLimitStandard
		if (containerName) {
			let suffix = '-' + Settings.label + '_'
			let regExp = new RegExp('^[dp]' + suffix + '(.+)$')
			let shortName = containerName.replace(regExp, '$1')
			let containerLimit = Settings.watcherMemoryLimitList[shortName]
			if (containerLimit) {
				limit = containerLimit
			}
		}
		return limit
	}
	static get watcherMemoryLimitList() {
		return {
			'logs': 500,
			'multiserver': 1500,
			'proxy': 1500,
			'worker': 2000
		}
	}
	static get watcherMemoryLimitStandard() {
		return 300
	}
	static get watcherWait() {
		return 1000 * 60
	}
}

module.exports = Settings