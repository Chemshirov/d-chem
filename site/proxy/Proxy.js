const cluster = require('cluster')
const cpus = require('os').cpus().length
const FilesWatcher = require('../../_common/FilesWatcher.js')
const Listener = require('./scripts/listener/Listener.js')
const Settings = require('../../_common/Settings.js')
const Starter = require('../../_common/Starter.js')

class Proxy extends Starter {
	constructor(currentPath) {
		super()
		this.currentPath = currentPath
		this.label = this.constructor.name
	}
	
	async atStart() {
		try {
			if (cluster.isMaster) {
				this.listener80 = new Listener(this.onError.bind(this), this.log, this.currentPath, Settings.port)
				await this.listener80.start()
				this.listener43111 = new Listener(this.onError.bind(this), this.log, this.currentPath, Settings.portChem)
				await this.listener43111.start()
				await this._masterHandler()
			} else {
				this.listener443 = new Listener(this.onError.bind(this), this.log, this.currentPath, Settings.portS)
				await this.listener443.start()
				let filesWatcher = new FilesWatcher(this.onError.bind(this))
				filesWatcher.onFileChanged(this._onCertificatesChanged.bind(this))
				await filesWatcher.watchPath('/usr/nodejs/le')
			}
			this.rabbitMQ.receive({
				callback: this._onReceive.bind(this)
			})
			this.rabbitMQ.receive({
				label: 'Dockerrun',
				callback: this._onDockerrunMessage.bind(this)
			})
		} catch (error) {
			this.onError(this.label, 'atStart', error)
		}
	}
	
	_masterHandler() {
		return new Promise(success => {
			this._masterHandlerSuccess = success
			this.workersAmount = cpus
			for (let i = 0; i < this.workersAmount; i++) {
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
			if (message.started) {
				this._onWorkerHasStarted(worker.id, message.started)
			} else if (message.label === 'addToCache') {
				// this._sendToAllWorkers(message)
			}
		})
		worker.on('error', error => {
			this.onError(this.label, '_fork', error)
		})
	}
	
	_onWorkerHasStarted(id, port) {
		if (!this._onWorkerHasStartedObject) {
			this._onWorkerHasStartedObject = {}
		}
		if (!this._onWorkerHasStartedObject[port]) {
			this._onWorkerHasStartedObject[port] = {}
		}
		this._onWorkerHasStartedObject[port][id] = true
		
		let amount = Object.keys(this._onWorkerHasStartedObject[port]).length
		if (amount === this.workersAmount) {
			this.log(`Server started with ${this.workersAmount} workers at port ${port}`)
			if (typeof this._masterHandlerSuccess === 'function') {
				this._masterHandlerSuccess()
			}
		}
	}
	
	_sendToAllWorkers(message) {
		if (typeof cluster.workers === 'object') {
			Object.keys(cluster.workers).forEach(workerId => {
				let worker = cluster.workers[workerId]
				worker.send(message)
			})
		}
	}
	
	_onCertificatesChanged(directory) {
		if (this._onCertificatesChangedST) {
			clearTimeout(this._onCertificatesChangedST)
		}
		this._onCertificatesChangedST = setTimeout(() => {
			let domain = directory.replace(/^\/.+\/([^\/]+)$/, '$1')
			if (this.listener443) {
				this.listener443.onCertificatesChanged(domain)
			}
		}, Settings.proxyResetTimeout)
	}
	
	_onDockerrunMessage(object) {
		if (object.type === 'started') {
			if (object.startedLabel !== this.label) {
				let listener = this._getListener()
				if (listener) {
					listener.restartSection(object.host)
				}
			}
		}
	}
	
	_onReceive(object) {
		if (object.request === 'changeStatic' && object.method === 'add') {
			let listener = this._getListener()
			if (listener) {
				listener.onNewFileList({ fileList: object.result, stage: object.stage })
			}
		}
	}
	
	_getListener() {
		return this.listener80 || this.listener443 || this.listener43111
	}
}

module.exports = Proxy