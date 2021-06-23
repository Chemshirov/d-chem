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
	
	static get developmentStageName() {
		return 'development'
	}
	
	// static get corsList() {
		// let mainSites = []
		// Settings.topLevelDomainNames.forEach(name => {
			// mainSites.push(Settings.mainName + '.' + name)
		// })
		// let allSites = mainSites.concat(Settings.devSites)
		// return allSites
	// }
	
	static get label() {
		return process.env.LABEL || 'site'
	}
	
	static get loggerLimit() {
		return 1000
	}
	static get loggerInterval() {
		return 500
	}
	
	static get port() {
		return 80
	}
	static get portS() {
		return 443
	}
	static get redisPort() {
		let port = 43003
		if (process.env.STAGE === Settings.developmentStageName) {
			port++
		}
		return port
	}
	static get mysqlPort() {
		let port = 43005
		if (process.env.STAGE === Settings.developmentStageName) {
			port++
		}
		return port
	}
	
	static get arbiterChoosingInterval() {
		return 1000 * 3
	}
	static get arbiterTimeInterval() {
		return 1000 * 15
	}
	static get arbiterTimeSiteList() {
		return ['www.google.com', 'https://www.cloudflare.com/', 'https://www.bbc.com/']
	}
	static get arbiterTimeSiteTimeout() {
		return 200
	}
	
	static get connectTimeout() {
		return 500
	}
	
	static get rabbitMqTimeout() {
		return 5000
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
	
	
	static get staticSizeLimit() {
		return 1024 * 1024 / 2
	}
	static get staticTtl() {
		return 60 * 60 * 24 * 7
	}
	static staticRouteTable() {
		let sda = '/usr/nodejs/sda/'
		let labelPath = process.env.TILDA + process.env.STAGE + '/' + process.env.LABEL + '/'
		let subsections = labelPath + 'subsections'
		let sdaLabelPath = sda + process.env.STAGE + '/' + process.env.LABEL + '/'
		return {
			[process.env.TILDA + 'libraries/']: ['/libraries/', '/js/'],
			[process.env.TILDA + 'libraries/bootstrap431/']: ['/bootstrap431/'],
			[labelPath + 'clientFiles/']: ['/'],
			[subsections +  '/finance6/www_old/']: ['/finance6/'],
			[subsections +  '/git/www/']: ['/git/'],
			
			[sdaLabelPath + 'subsections/data/files/']: ['/data/files/'],
			[sda + '/audiobooks/']: ['/audiobooks/'],
			[sda + '/films/']: ['/films/'],
			[sda + '/music/']: ['/music/'],
			
			[process.env.TILDA + 'chem_develop/www/data/']: ['/data/'],
			[process.env.TILDA + 'chem_develop/www/index/']: ['/index/'],
			[process.env.TILDA + 'chem_develop/www/js/']: ['/js/'],
		}
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
}

module.exports = Settings