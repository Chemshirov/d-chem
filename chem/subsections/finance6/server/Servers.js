const AbstractServers = require('../../../../_common/Servers.js')
const OldCode = require('./oldCode/Init.js')

class Servers extends AbstractServers {
	constructor(onError, currentPath) {
		super()
		this._onError = onError
		this.currentPath = currentPath
	}
	
	async start(ports) {
		this.ports = ports
		await super.startHttp()
		super.setRouter(this._routes)
		
		this.oldCode = new OldCode(this._onError, this.websockets)
		this.finance6 = this.oldCode.init()
	}
	
	_routes(url, req, res) {
		let newUrl = url.replace(/^\/finance6/, '').replace(/^\//, '')
		let cookies = super.getCookies(req)
		this.finance6.main.html(res, newUrl, cookies)
	}
}

module.exports = Servers