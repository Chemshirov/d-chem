const RabbitMQ = require('../../_common/RabbitMQ.js')
const siteSettings = require('/usr/nodejs/sda/' + process.env.STAGE + '/' + process.env.LABEL + '/Settings.js')
const Statistics = require('../../_common/Statistics.js')
const Settings = require('../../_common/Settings.js')

const http = require('http')
const https = require('https')
const proxyServer = require('http-proxy')
const fs = require('fs')
const tls = require('tls')
const cluster = require('cluster')
const cpuAmount = require('os').cpus().length

class Onrequest {
	constructor() {
		this.label = this.constructor.name
		
		this.rabbitMQ = new RabbitMQ(this._onError.bind(this), this._rabbitMQreceive.bind(this))
		this.statistics = new Statistics(this._onError.bind(this), this.rabbitMQ)
		this.proxy = proxyServer.createProxyServer(this._getProxyOptions('websocket'))
		this._start()
	}
	
	_start() {
		this.rabbitMQ.connect().then(async () => {
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
					this.statistics.started()
				} else {
					await this._getDomain()
					let preRouterFunction = this._preRouter.bind(this)
					let httpServer = http.createServer(preRouterFunction).listen(Settings.port)
					httpServer.on('upgrade', (req, socket, head) => {
						this.proxy.ws(req, socket, head)
					})
					let httpsServer = https.createServer(this._getSsl(), preRouterFunction).listen(Settings.portS)
					httpsServer.on('upgrade', (req, socket, head) => {
						this.proxy.ws(req, socket, head)
					})
				}
			} catch (err) {
				this._onError(this.label, '_start', err)
			}
		})
	}
	
	async _startDockers() {
		try {
			let prePath = process.env.STAGE + '/' + process.env.LABEL + '/'
			await this.rabbitMQ.send('dockerrun', {type: 'start', path: prePath + 'watcher/'})
			await this.rabbitMQ.send('dockerrun', {type: 'start', path: prePath + 'router/'})
			await this.rabbitMQ.send('dockerrun', {type: 'start', path: prePath + 'subsections/finance6/'})
			await this.rabbitMQ.send('dockerrun', {type: 'start', path: prePath + 'subsections/git/'})
		} catch(err) {
			this._onError(this.label, '_startDockers', err)
		}
	}
	
	async _preRouter(request, response) {
		let type = this._getType(request)
		this.proxy.web(request, response, this._getProxyOptions(type))
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
			} if (url.split('/').length < 3) {
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
	
	_getDomain() {
		return new Promise(success => {
			fs.readFile(process.env.TILDA + '/server_ip.txt', (err, result) => {
				if (err) {
					this._onError(this.label, '_getDomain readFile', err)
				} else {
					let ip = result.toString().trim()
					let domainName = siteSettings.nameByIp(ip)
					console.log('domainName', domainName)
					this.domain = domainName
					success()
				}
			})
		}).catch(err => {
			this._onError(this.label, '_getDomain', err)
		})
	}
	
	_getSsl() {
		let path = '/usr/nodejs/le/' + this.domain + '/'
		let ssl = {
			key: fs.readFileSync(path + 'privkey.pem', 'utf8'),
			cert: fs.readFileSync(path + 'cert.pem', 'utf8')
		}
		return ssl
	}
	
	_rabbitMQreceive(object, onDone) {
		let done = false
		if (done) {
			onDone(done)
		}
	}
	
	_onError(className, method, error) {
		this.rabbitMQ.send('logger', {type: 'error', className, method, error})
	}
}

module.exports = Onrequest