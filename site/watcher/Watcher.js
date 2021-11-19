const Arbiter = require('./Arbiter.js')
const ContainersHandler = require('./ContainersHandler.js')
const FilesWatcher = require('../../_common/FilesWatcher.js')
const fs = require('fs')
const Media = require('./media/Media.js')
const sda = '/usr/nodejs/sda/'
const Settings = require('../../_common/Settings.js')
const Starter = require('../../_common/Starter.js')
const StaticsSetter = require('./StaticsSetter.js')
const Syncer = require('./Syncer.js')

class Watcher extends Starter {
	constructor(currentPath) {
		super()
		this.currentPath = currentPath
		this.label = this.constructor.name
		this.stageLabelPath = process.env.STAGE + '/' + process.env.LABEL + '/'
		this.clientFilesPath = process.env.TILDA + this.stageLabelPath + 'clientFiles/'
	}
	
	async atStart() {
		try {
			await this.getDomainAndIps()
			let setupObject = {
				currentPath: this.currentPath,
				onError: this.boundOnError,
				log: this.log,
				rabbitMQ: this.rabbitMQ,
				redis: this.redis,
				currentIp: this.currentIp,
				anotherIp: this.anotherIp,
				predispositionalMasterIp: this.predispositionalMasterIp,
				isMaster: this.isMaster.bind(this),
			}
			this.arbiter = new Arbiter(setupObject)
			await this.arbiter.init() 
			this.syncer = new Syncer(setupObject)
			await this.syncer.init()
			this.arbiter.setSyncer(this.syncer)
			this.containersHandler = new ContainersHandler(setupObject)
			this.containersHandler.start()
			this.staticsSetter = new StaticsSetter(setupObject)
			if (process.env.CACHE_ON) {
				this.staticsSetter.start()
			}
			await this._readServiceWorker()
			await this._watch()
			new Media(setupObject)
		} catch(error) {
			this.onError(this.label, 'atStart', error)
		}
	}
	
	async _watch() {
		try {
			let filesWatcher = new FilesWatcher(this.onError.bind(this))
			filesWatcher.onFileChanged(this._onFileChanged.bind(this))
			filesWatcher.addStringToIgnore('_tempFiles', true)
			filesWatcher.addStringToIgnore('.temp')
			filesWatcher.addStringToIgnore('.error')
			filesWatcher.addStringToIgnore('.old')
			filesWatcher.addStringToIgnore('.log')
			filesWatcher.addStringToIgnore('pack_')
			filesWatcher.addStringToIgnore('.next', true)
			filesWatcher.addStringToIgnore('next-env.d.ts')
			filesWatcher.addStringToIgnore('stageSensitive/props.json')
			filesWatcher.addStringToIgnore('stageSensitive/admins.json')
			await filesWatcher.watchPath(process.env.TILDA + process.env.STAGE)
			await filesWatcher.watchPath(sda + this.stageLabelPath + 'subsections/data/files/')
			await filesWatcher.watchPath(sda + this.stageLabelPath + 'subsections/logs/')
			await filesWatcher.watchPath(sda + this.stageLabelPath + 'subsections/multiserver/')
			await filesWatcher.watchPath(sda + 'audiobooks')
			await filesWatcher.watchPath(sda + 'films')
			await filesWatcher.watchPath(sda + 'music')
			if (process.env.STAGE === Settings.developmentStageName) {
				await filesWatcher.watchPath(process.env.TILDA + 'chem_develop/www')
			} else {
				await filesWatcher.watchPath(process.env.TILDA + 'chem/https/www')
			}
		} catch (error) {
			this.onError(this.label, '_watch', error)
		}
	}
	
	async _onFileChanged(directory, fileName) {
		try {
			let fileString = (directory + '/' + fileName).replace(/[\/]+/g, '/')
			await this.staticsSetter.addFile(fileString)
			if (!directory.includes('stageSensitive')) {
				this.syncer.request(directory)
			}
			this.rabbitMQ.send({ type: 'FileHasChanged', directory, fileName })
			this._updateServiceWorkerFile(directory, fileName)
			this.log(fileName + ' has been changed (' + fileString + ')')
		} catch (error) {
			this.onError(this.label, '_onFileChanged', error)
		}
	}
	
	async _updateServiceWorkerFile(directory, fileName) {
		try {
			let containsWww = directory.includes('www')
			let isFileTreeJson = (containsWww && fileName === 'fileTree.json')
			let isClientFiles = ((directory + '/') === this.clientFilesPath)
			if ((containsWww && !isFileTreeJson) || isClientFiles) {
				let writeAcknowledgeThatSyncerHasFinishedLastJob = Settings.standardTimeout * 10
				let ok = false
				let itself = fileName.includes('serviceWorker.js')
				if (itself) {
					let lastWriteTimeout = Date.now() - (this._serviceWorkerAvoidingLoopTime || 0)
					if (lastWriteTimeout > writeAcknowledgeThatSyncerHasFinishedLastJob * 2) {
						await this._readServiceWorker()
						ok = true
					}
				} else {
					ok = true
				}
				if (ok) {
					if (this._updateServiceWorkerFileST) {
						clearTimeout(this._updateServiceWorkerFileST)
					}
					this._updateServiceWorkerFileST = setTimeout(async () => {
						try {
							let firstString = [`let cacheName = 'newCacheDate ${new Date().toLocaleString()}'`]
							let otherStrings = this._serviceWorkerFileStrings
							let fileContent = firstString.concat(otherStrings).join('\n')
							this._serviceWorkerAvoidingLoopTime = Date.now()
							await this._writeServiceWorker(fileContent)
						} catch (error) {
							this.onError(this.label, '_updateServiceWorkerFile setTimeout', error)
						}
					}, writeAcknowledgeThatSyncerHasFinishedLastJob)
				}
			}
		} catch (error) {
			this.onError(this.label, '_updateServiceWorkerFile', error)
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