const AbstractServers = require('../../../../_common/Servers.js')
const Sockets = require('./Sockets.js')

class Servers extends AbstractServers {
	constructor(onError) {
		super()
		this._onError = onError
	}
	
	async start(commonObject, ports) {
		this.o = commonObject
		this.ports = ports
		await super.startHttp()
		super.setRouter(this._routes)
		
		this.o.Sockets = new Sockets(this._onError, this.o, this.websockets)
	}
	
	_routes(url, reqest, response) {
		let html = this.o.Html.get()
		response.send(html)
	}
}

module.exports = Servers