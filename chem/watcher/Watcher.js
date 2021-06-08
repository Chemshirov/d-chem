const FilesWatcher = require('../../_common/FilesWatcher.js')
const RabbitMQ = require('../../_common/RabbitMQ.js')
const StaticSetter = require('./StaticSetter.js')
const StaticAddRoute = require('./StaticAddRoute.js')
const Statistics = require('../../_common/Statistics.js')

class Watcher {
	constructor(currentPath) {
		this.currentPath = currentPath
		this.label = this.constructor.name
		
		this.rabbitMQ = new RabbitMQ(this._onError.bind(this), this._rabbitMQreceive.bind(this))
		this.statistics = new Statistics(this._onError.bind(this), this.rabbitMQ)
		
		this._start()
	}
	
	_start() {
		this.rabbitMQ.connect().then(async () => {
			try {
				let staticSetter = new StaticSetter(this._onError.bind(this), this.currentPath, this.rabbitMQ)
				this.staticAddRoute = new StaticAddRoute(this._onError.bind(this))
				await staticSetter.start()
				await this._watch()
				this.rabbitMQ.send('dockerrun_started', { type: 'started', path: process.env.AFTER_TILDA })
				this.statistics.started()
			} catch (err) {
				this._onError(this.label, '_start', err)
			}
		})
	}
	
	async _watch() {
		try {
			let filesWatcher = new FilesWatcher(this._onError.bind(this))
			filesWatcher.onFileChanged(this._onFileChanged.bind(this))
			filesWatcher.addStringToIgnore('_webpack')
			filesWatcher.addStringToIgnore('_tempFiles', true)
			filesWatcher.addStringToIgnore('.temp')
			
			let path = process.env.TILDA + process.env.STAGE
			await filesWatcher.watchPath(path)
		} catch (err) {
			this._onError(this.label, '_start', err)
		}
	}
	
	async _onFileChanged(directory, fileName) {
		try {
			await this.staticAddRoute.add(directory + '/' + fileName)
			this.rabbitMQ.sendToAll(this._onFileChanged.name, { directory, fileName })
		} catch (err) {
			this._onError(this.label, '_start', err)
		}
	}
	
	_rabbitMQreceive(object, onDone) {
		onDone(true)
	}
	
	_onError(className, method, error) {
		this.rabbitMQ.send('logger', {type: 'error', className, method, error})
	}
}

module.exports = Watcher