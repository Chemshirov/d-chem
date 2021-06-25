const Arbiter = require('./Arbiter.js')
const FilesWatcher = require('../../_common/FilesWatcher.js')
const fs = require('fs')
const sda = '/usr/nodejs/sda/'
const StaticSetter = require('./StaticSetter.js')
const StaticAddRoute = require('./StaticAddRoute.js')
const Starter = require('../../_common/Starter.js')
const Syncer = require('./Syncer.js')

class Watcher extends Starter {
	constructor(currentPath) {
		super()
		this.currentPath = currentPath
		this.label = this.constructor.name
		let stageLabelPath = process.env.STAGE + '/' + process.env.LABEL + '/'
		this.clientFilesPath = process.env.TILDA + stageLabelPath + 'clientFiles/'
		this.dataFilesPath = sda + stageLabelPath + 'subsections/data/files/'
	}
	
	async atStart() {
		try {
			this.arbiter = new Arbiter(this.onError.bind(this), this.rabbitMQ)
			await this.arbiter.init()
			this.syncer = new Syncer(this.onError.bind(this), this.rabbitMQ)
			await this.syncer.init()
			let staticSetter = new StaticSetter(this.onError.bind(this), this.currentPath, this.rabbitMQ)
			this.staticAddRoute = new StaticAddRoute(this.onError.bind(this))
			if (process.env.CACHE_ON) {
				await staticSetter.start()
			}
			await this._readServiceWorker()
			await this._watch()
		} catch(error) {
			this.onError(this.label, 'atStart', error)
		}
	}
	
	async _watch() {
		try {
			let filesWatcher = new FilesWatcher(this.onError.bind(this))
			filesWatcher.onFileChanged(this._onFileChanged.bind(this))
			filesWatcher.addStringToIgnore('_webpack')
			filesWatcher.addStringToIgnore('_tempFiles', true)
			filesWatcher.addStringToIgnore('.temp')
			filesWatcher.addStringToIgnore('.log')
			await filesWatcher.watchPath(process.env.TILDA + process.env.STAGE)
			await filesWatcher.watchPath(this.dataFilesPath)
			await filesWatcher.watchPath(process.env.TILDA + 'chem/https/files/')
		} catch (error) {
			this.onError(this.label, '_start', error)
		}
	}
	
	async _onFileChanged(directory, fileName) {
		try {
			console.log('_onFileChanged', directory, fileName)
			await this.syncer.request(directory)
			await this.staticAddRoute.add(directory + '/' + fileName)
			this._updateServiceWorkerFile(directory, fileName)
			this.rabbitMQ.sendToAll(this._onFileChanged.name, { directory, fileName })
		} catch (error) {
			this.onError(this.label, '_start', error)
		}
	}
	
	_updateServiceWorkerFile(directory, fileName) {
		let containsWww = directory.includes('www')
		let isClientFiles = directory.includes(this.clientFilesPath)
		let notItSelf = !fileName.includes('serviceWorker.js')
		if ((containsWww || isClientFiles) && notItSelf) {
			let writeAcknowledgeThatSyncerHasFinishedLastJob = 1000
			if (this._updateServiceWorkerFileST) {
				clearTimeout(this._updateServiceWorkerFileST)
			}
			this._updateServiceWorkerFileST = setTimeout(async () => {
				try {
					let firstString = [`let cacheName = 'newCacheDate ${new Date().toLocaleString()}'`]
					let otherStrings = this._serviceWorkerFileStrings
					let fileContent = firstString.concat(otherStrings).join('\n')
					await this._writeServiceWorker(fileContent)
				} catch (error) {
					this.onError(this.label, '_updateServiceWorkerFile', error)
				}
			}, writeAcknowledgeThatSyncerHasFinishedLastJob)
		}
	}
	
	_readServiceWorker() {
		return new Promise(success => {
			let fileString = this.clientFilesPath + 'serviceWorker.js'
			let file = fs.readFile(fileString, (error, data) => {
				if (error) {
					this.onError(this.label, '_readServiceWorker readFile', error)
				} else {
					let allStrings = data.toString().replace(/\r/mg, '').split('\n')
					allStrings.shift()
					this._serviceWorkerFileStrings = allStrings
					success()
				}
			})
		}).catch(error => {
			this.onError(this.label, '_readServiceWorker', error)
		})
	}
	
	_writeServiceWorker(fileContent) {
		return new Promise(success => {
			let fileString = this.clientFilesPath + 'serviceWorker.js'
			let tempName = fileString + '.temp'
			fs.writeFile(tempName, fileContent, error => {
				if (error) {
					this.onError(this.label, '_writeServiceWorker write temp', error)
				} else {
					fs.copyFile(tempName, fileString, error => {
						if (error) {
							this.onError(this.label, '_writeServiceWorker copyFile', error)
						} else {
							fs.unlink(tempName, error => {
								if (error) {
									this.onError(this.label, '_writeServiceWorker unlink', error)
								} else {
									fs.chown(fileString, 1000, 1000, error => {
										if (error) {
											this.onError(this.label, '_writeServiceWorker chown', error)
										} else {
											success()
										}
									})
								}
							})
						}
					})
				}
			})
		}).catch(error => {
			this.onError(this.label, '_writeServiceWorker', error)
		})
	}
}

module.exports = Watcher