const fs = require('fs')
const sda = '/usr/nodejs/sda/'
const Settings = require('../../../_common/Settings.js')
const siteSettings = require(sda + process.env.STAGE + '/' + process.env.LABEL + '/Settings.js')

class Films {
	constructor(setupObject) {
		this.onError = setupObject.onError
		this.log = setupObject.log
		this.rabbitMQ = setupObject.rabbitMQ
		this.currentIp = setupObject.currentIp
		this.label = this.constructor.name
		
		this.directory = '/usr/nodejs/sda/films'
		
		this._start()
	}
	
	async _start() {
		try {
			await this.rabbitMQ.receive(this._onWatcher.bind(this))
			this._reIndex()
			setInterval(() => {
				this._reIndex()
			}, Settings.mediaCheckInterval)
		} catch(error) {
			this.onError(this.label, '_start', error)
		}
	}
	
	_onWatcher(object) {
		if (object.type === 'FileHasChanged') {
			if (object.directory.startsWith(this.directory)) {
				this._reIndex()
			}
		}
	}
	
	_reIndex() {
		return new Promise(async (success, onFail) => {
			try {
				let isPreMaster = (this.currentIp === siteSettings.predispositionalMasterIp)
				let isProduction = (process.env.STAGE === Settings.productionStageName)
				if (isPreMaster && isProduction) {
					let { object, tree } = await this._getFilesList()
					this.filmsObject = object
					this.filmsTree = tree
					this._wrongFormatHandle(object._wrongFormat)
				}
				success()
			} catch (error) {
				this.onError(this.label, '_reIndex catch', error)
				onFail()
			}
		}).catch(error => {
			this.onError(this.label, '_reIndex', error)
		})
	}
	
	_wrongFormatHandle(wrongFormatObject) {
		Object.keys(wrongFormatObject).forEach(pathToFilm => {
			let isError = pathToFilm.endsWith('.error')
			let isTemp = pathToFilm.endsWith('.temp')
			if ((/^.+\.[^\.\_]+$/).test(pathToFilm) && !isError && !isTemp) {
				if (pathToFilm.endsWith('.srt')) {
					
				} else {
					let message = {
						label: this.label,
						request: 'convertToH264',
						filePath: pathToFilm,
					}
					this.rabbitMQ.send({ label: 'Worker', message })
					this.log(message)
				}
			}
		})
	}
	
	_getObject() {
		return new Promise(async success => {
			try {
				let { path, object, tree } = await this._getFilesList()
				success()
			} catch (error) {
				this.onError(this.label, '_getObject catch', error)
			}
		}).catch(error => {
			this.onError(this.label, '_getObject', error)
		})
	}
	
	_getFilesList(path, object, tree) {
		return new Promise(async success => {
			try {
				if (!path) {
					path = this.directory
				}
				if (!object) {
					object = {
						_propertiesList: {},
						_subtitles: {},
						_wrongFormat: {},
						_totalSize: 0,
					}
				}
				if (!tree) {
					tree = {}
				}
				fs.readdir(path, async (error, fileList) => {
					try {
						if (!error) {
							for (let i = 0; i < fileList.length; i++) {
								let fileOrDirectory = fileList[i]
								let fullPath = path + '/' + fileOrDirectory
								let stats = fs.statSync(fullPath, { throwIfNoEntry: false })
								object._propertiesList[fullPath] = stats
								if (stats.isDirectory()) {
									tree[fileOrDirectory] = {}
									await this._getFilesList(fullPath, object, tree[fileOrDirectory])
								} else {
									object._totalSize += stats.size / 1024 / 1024
									if (fileOrDirectory.endsWith('.mp4')) {
										tree[fileOrDirectory] = {}
									} else {
										object._wrongFormat[fullPath] = true
									}
								}
							}
							success({ path, object, tree })
						} else {
							this.onError(this.label, '_getFilesList readdir', error)
						}
					} catch (error) {
						this.onError(this.label, '_getFilesList readdir catch', error)
					}
				})
			} catch (error) {
				this.onError(this.label, '_getFilesList catch', error)
			}
		}).catch(error => {
			this.onError(this.label, '_getFilesList', error)
		})
	}
}

module.exports = Films