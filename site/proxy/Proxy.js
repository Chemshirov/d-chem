const cluster = require('cluster')
const cpus = require('os').cpus().length
const Server = require('./scripts/Server.js')
const Settings = require('../../_common/Settings.js')
const Smtp = require('./scripts/Smtp.js')
const Starter = require('../../_common/Starter.js')

class Proxy extends Starter {
	constructor() {
		super()
		this.label = this.constructor.name
		this._portsWorkers = {
			[Settings.port]: {},
			[Settings.portS]: {},
		}
		this._requestCount = 0
		this._onCertificatesChangedST = false
	}
	
	async atStart() {
		try {
			if (cluster.isMaster) {
				await this.getDomainAndIps()
				let onRequest = this._onRequest.bind(this)
				await this._setServer(Settings.portChem, onRequest)
				await this._setWorkers()
				this.rabbitMQ.receive({
					label: 'Watcher',
					callback: this._onWatcher.bind(this)
				})
				// new Smtp(this.boundOnError, this.log, 25)
				// new Smtp(this.boundOnError, this.log, 465)
				// this._setRps()
			} else {
				await this._setServer(Settings.port)
				await this._setServer(Settings.portS)
			}
		} catch (error) {
			this.onError(this.label, 'atStart', error)
		}
	}
	
	async _setServer(port, onRequest) {
		try {
			let server = new Server(this.boundOnError, this.log, port, this.rabbitMQ)
			await server.start(onRequest)
			if (onRequest) {
				this.log('Server has started at port ' + port)
			}
		} catch (error) {
			this.onError(this.label, '_setServer', error)
		}
	}
	
	_onRequest(port) {
		this._requestCount++
	}
	
	_setWorkers() {
		return new Promise(success => {
			this._setWorkersSuccess = success
			this._workersAmount = (cpus > 8 ? (cpus / 2) : cpus)
			for (let i = 0; i < this._workersAmount; i++) {
				this._fork()
			}
			cluster.on('exit', (worker, code, signal) => {
				this.onError(this.label, '_masterHandler, cluster.on exit', {code, signal, id: worker.id})
				setTimeout(() => {
					this._fork()
				}, Settings.proxyResetTimeout)
			})
		}).catch(error => {
			this.onError(this.label, '_masterHandler', error)
		})
	}
	
	_fork() {
		let worker = cluster.fork()
		worker.on('message', message => {
			if (message.started && message.port) {
				let port = message.port
				this._portsWorkers[port][worker.id] = worker
				this._ifWorkerIsTheLast(port)
			} else if (message.onRequest) {
				this._onRequest(message.onRequest)
			}
		})
		worker.on('error', error => {
			this.onError(this.label, '_fork', error)
		})
	}
	
	_ifWorkerIsTheLast(port) {
		let ports = Object.keys(this._portsWorkers)
		let completedPorts = {}
		ports.forEach(port => {
			let workers = Object.keys(this._portsWorkers[port])
			if (workers.length === this._workersAmount) {
				this.log(`Server has started with ${workers.length} workers at port ${port}`)
				completedPorts[port] = true
			}
		})
		if (Object.keys(completedPorts).length === ports.length) {
			if (typeof this._setWorkersSuccess === 'function') {
				this._setWorkersSuccess()
			}
		}
	}
	
	_onWatcher(object) {
		if (object && typeof object === 'object') {
			if (object.type === 'FileHasChanged') {
				let directory = (object.directory + '')
				if (directory.includes('/le/')) {
					let domain = directory.replace(/^\/.+le\/([^\/]+)\/$/, '$1')
					if (Settings.domains.includes(domain)) {
						if (this._onCertificatesChangedST) {
							clearTimeout(this._onCertificatesChangedST)
						}
						this._onCertificatesChangedST = setTimeout(() => {
							let workers = Object.keys(this._portsWorkers[Settings.portS])
							workers.forEach(workerId => {
								let worker = this._portsWorkers[Settings.portS][workerId]
								worker.send('restart')
							})
							this.log('Port ' + Settings.portS + ' has been restarted due to new ssl certificates')
						}, Settings.proxyResetTimeout)
					}
				}
			}
		}
	}
	
	_setRps() {
		setInterval(() => {
			// this.log('requests per second: ', this._requestCount)
			this._requestCount = 0
		}, 1000)
	}
}

module.exports = Proxy