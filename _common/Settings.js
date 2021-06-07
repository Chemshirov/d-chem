class Settings {
	static get mainName() {
		return 'chemshirov'
	}
	static get topLevelDomainNames() {
		return ['com', 'ru']
	}
	static get domains() {
		let domains = []
		Settings.topLevelDomainNames.forEach(name => {
			domains.push(Settings.mainName + '.' + name)
		})
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
		return 1024 * 1024 / 5
	}
	static get staticTtl() {
		return 60 * 60 * 24 * 7
	}
	static staticRouteTable() {
		let sda = '/usr/nodejs/sda/'
		let subsections = process.env.TILDA + process.env.STAGE + '/' + process.env.LABEL + '/subsections'
		return {
			[process.env.TILDA + 'libraries/']: ['/libraries/', '/js/'],
			[process.env.TILDA + 'libraries/bootstrap431/']: ['/bootstrap431/'],
			[sda + process.env.LABEL + '/' + process.env.STAGE + '/files/']: ['/data/files/'],
			[sda + '/audiobooks/']: ['/audiobooks/'],
			[sda + '/films/']: ['/films/'],
			[sda + '/music/']: ['/music/'],
			[subsections +  '/finance6/www_old/']: ['/finance6/'],
			
			[process.env.TILDA + 'chem_develop/www/data/']: ['/data/'],
			[process.env.TILDA + 'chem_develop/www/index/']: ['/index/'],
			[process.env.TILDA + 'chem_develop/www/js/']: ['/js/'],
			[process.env.TILDA + 'chem_develop/www/ -maxdepth 1']: ['/'],
		}
	}
	
	static get statisticsInterval() {
		return 1000
	}
	
	static get timeZone() {
		return 3
	}
	
	static get mimeTypes() {
		return {
			'.css': 'text/css; charset=UTF-8',
			'.map': 'application/json; charset=UTF-8',
			'.js': 'application/javascript; charset=UTF-8',
			'.json': 'application/json; charset=UTF-8',
			'.txt': 'text/plain; charset=UTF-8',
			'.html': 'text/html; charset=UTF-8',
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
}

module.exports = Settings