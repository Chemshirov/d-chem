const cluster = require('cluster')
const cpuAmount = require('os').cpus().length
const http = require('http')
const proxyServer = require('http-proxy')
const Settings = require('../../_common/Settings.js')
const Starter = require('../../_common/Starter.js')

class Onrequest extends Starter {
	constructor() { 
		super()
		this.label = this.constructor.name
	}
	
	async atStart() {
		try {
			if (cluster.isPrimary) {
				console.log('await')
				await this._startDockers()
				for (let i = 0; i < cpuAmount; i++) {
					cluster.fork()
				}
				cluster.on('exit', (worker, code, signal) => {
					cluster.fork()
				})
			} else {
				this.proxy = proxyServer.createProxyServer(this._getProxyOptions('websocket'))
				let httpServer = http.createServer((request, response) => {
					let type = this._getType(request)
					this.proxy.web(request, response, this._getProxyOptions(type))
				})
				httpServer.on('upgrade', (req, socket, head) => {
					this.proxy.ws(req, socket, head)
				})
				httpServer.listen(Settings.port)
			}
		} catch (err) {
			this.onError(this.label, 'atStart', err)
		}
	}
	
	async _startDockers() {
		try {
			let prePath = process.env.STAGE + '/' + process.env.LABEL + '/'
			await this.rabbitMQ.send('dockerrun', {type: 'start', path: prePath + 'subsections/finance6/'})
			await this.rabbitMQ.send('dockerrun', {type: 'start', path: prePath + 'subsections/git/'})
			await this.rabbitMQ.send('dockerrun', {
				type: 'start',
				path: prePath + 'watcher/',
				settings: [true]
			})
			await this.rabbitMQ.send('dockerrun', {type: 'start', path: prePath + 'router/'})
			if (process.env.STAGE === Settings.developmentStageName) {
				await this.rabbitMQ.send('dockerrun', {
					type: 'start',
					path: prePath + '/listener/',
					settings: [Settings.port, Settings.portS]
				})
			}
		} catch(err) {
			this.onError(this.label, '_startDockers', err)
		}
	}
	
	_getType(request) {
		let type = 'static'
		
		let url = request.url + ''
			url = url.split('?')[0]
			url = url.split('#')[0]
		if (!url) {
			url = '/'
		}
		if (url.substring(0, 11) === '/socket.io/') {
			type = 'websocket'
		} else {
			if (url.split('.').length < 2) {
				type = 'dynamic'
			} else {
				let reverseUrl = url.split('').reverse().join('')
				let ext = reverseUrl.split('.')[0].split('').reverse().join('')
				if (reverseUrl.substring(0, 1) === '/') {
					type = 'dynamic'
				} else if (['map', 'mp3', 'mp4'].includes(ext)) {
					type = 'dynamic'
				}
			}
		}
		return type
	}
	
	_getProxyOptions(type) {
		let options = {}
		if (!this._typeProxyOptionsObject) {
			this._typeProxyOptionsObject = {}
		}
		if (this._typeProxyOptionsObject[type]) {
			options = this._typeProxyOptionsObject[type]
		} else {
			let letter = type.substring(0, 1).toUpperCase()
			let host = process.env.PREFIX + process.env.LABEL + '_' + 'router' + letter
			let target = {
				host,
				port: Settings.port
			}
			options = { target } 
			if (type === 'websocket') {
				options.ws = true
			}
			this._typeProxyOptionsObject[type] = options
		}
		return options
	}
}

module.exports = Onrequest