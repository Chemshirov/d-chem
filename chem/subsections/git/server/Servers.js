const AbstractServers = require('../../../../_common/Servers.js')

class Servers extends AbstractServers {
	constructor(onError) {
		super()
		this._onError = onError
	}
	
	async start(ports) {
		this.ports = ports
		await super.startHttp()
		super.setRouter(this._routes)
	}
	
	_routes(url, reqest, response) {
		console.log(url)
		response.send('git')
	}
}

module.exports = Servers