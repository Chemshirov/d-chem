const child_process = require('child_process')
const fs = require('fs')
const Settings = require('./Settings.js') 

class FilesWatcher {
	constructor(onError) {
		this._onError = onError
		this.label = FilesWatcher.name
		this._stringsToIgnoreInFiles = {}
		this._stringsToIgnoreInDirectories = {}
	}
	
	addStringToIgnore(string, isInDirectories) {
		if (!isInDirectories) {
			this._stringsToIgnoreInFiles[string] = true
		} else {
			this._stringsToIgnoreInDirectories[string] = true
		}
	}
	
	onFileChanged(callback) {
		if (typeof callback === 'function') {
			this._fileHasBeenChanged = callback
		}
	}
	
	watchPath(path) {
		return new Promise(async success => {
			try {
				let directories = await this._allDirectories(path)
				if (!directories) {
					directories = []
				}
				for (let i = 0; i < directories.length; i++) {
					let directory = directories[i]
					let ignore = this._checkForIgnoreness(directory, true)
					if (!ignore) {
						this._watching(directory)
					}
				}
				success()
			} catch(error) {
				this._onError(this.label, 'start catch', error)
			}
		}).catch(error => {
			this._onError(this.label, 'start', error)
		})
	}
	
	_watching(directory) {
		if (!this._watchingPool) {
			this._watchingPool = {}
		}
		if (!this._watchingPool[directory]) {
			this._watchingPool[directory] = true
			fs.watch(directory, (eventType, fileName) => {
				let ignore = this._checkForIgnoreness(fileName)
				if (!ignore) {
					let hasDot = (fileName.split('.').length > 1)
					let isRsyncTemp = (fileName.startsWith('.') && fileName.split('.').length > 2)
					if (hasDot && !isRsyncTemp) {
						this._whenFileHasBeenChanged(directory, fileName, eventType)
					} else {
						let maybeDirectory = directory + '/' + fileName
						try {
							let isDirectory = fs.lstatSync(maybeDirectory).isDirectory()
							if (isDirectory) {
								this.watchPath(maybeDirectory)
							}
						} catch(e) {
							let tempFiles = 'areVeryQuickToVanish'
						}
					}
				}
			})
		}
	}
	
	_whenFileHasBeenChanged(directory, fileName, eventType) {
		if (!this._whenFileHasBeenChangedStStorage) {
			this._whenFileHasBeenChangedStStorage = {}
		}
		this._whenFileHasBeenChangedStStorage[directory + '/' + fileName] = { directory, fileName, eventType }
		if (this._whenFileBeenHasChangedST) {
			clearTimeout(this._whenFileBeenHasChangedST)
		}
		this._whenFileBeenHasChangedST = setTimeout(() => {
			this._filesHaveBeenChanged()
		}, Settings.filesWatcherDelay)
	}
	
	_filesHaveBeenChanged() {
		if (!this._filesHaveBeenChangedCount) {
			this._filesHaveBeenChangedCount = 0
		}
		let tempObject = JSON.parse(JSON.stringify(this._whenFileHasBeenChangedStStorage))
		this._whenFileHasBeenChangedStStorage = {}
		let array = Object.keys(tempObject)
		let isTooMuch = (array.length > Settings.filesWatcherLimit)
		let uniqueDirectoriesObject = {}
		array.forEach(key => {
			let { directory, fileName, eventType } = tempObject[key]
			uniqueDirectoriesObject[directory] = { fileName, eventType }
			if (!isTooMuch) {
				this._filesHaveBeenChangedDelay(directory, fileName, eventType)
			}
		})
		if (isTooMuch) {
			let uniqueDirectories = Object.keys(uniqueDirectoriesObject)
			this._filesHaveBeenChangedCount = Settings.filesWatcherLimit
			uniqueDirectories.forEach(directory => {
				let { fileName, eventType } = uniqueDirectoriesObject[directory]
				this._filesHaveBeenChangedDelay(directory, fileName, eventType)
			})
			if (this._filesHaveBeenChangedCount >= Settings.filesWatcherLimit) {
				this._filesHaveBeenChangedCount -= Settings.filesWatcherLimit
			} else {
				this._filesHaveBeenChangedCount = 0
			}
		}
	}
	
	_filesHaveBeenChangedDelay(directory, fileName, eventType) {
		setTimeout(() => {
			this._filesHaveBeenChangedCount--
			if (this._fileHasBeenChanged) {
				this._fileHasBeenChanged(directory, fileName, eventType)
			}
		}, Settings.filesWatcherDelay * this._filesHaveBeenChangedCount)
		this._filesHaveBeenChangedCount++
	}
	
	_allDirectories(path) {
		return new Promise(success => {
			let cmd = `find "${path}" -type d`
			child_process.exec(cmd, (error, stdin, stdout) => {
				if (error) {
					this._onError(this.label, '_allDirectories child_process', error)
				} else {
					let directories = stdin.toString().trim().split('\n')
					success(directories)
				}
			})
		}).catch(error => {
			this._onError(this.label, '_allDirectories', error)
		})
	}
	
	_checkForIgnoreness(nameString, isInDirectories) {
		let ignore = false
		let ignoreObject = this._stringsToIgnoreInFiles
		if (isInDirectories) {
			ignoreObject = this._stringsToIgnoreInDirectories
		}
		let ignores = Object.keys(ignoreObject)
		if (ignores.length) {
			ignores.some(ignoreString => {
				if (nameString.includes(ignoreString)) {
					ignore = true
					return true
				}
			})
		}
		return ignore
	}
}

module.exports = FilesWatcher