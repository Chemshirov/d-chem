// watchPath is deprecated

const child_process = require('child_process')
const fs = require('fs')
const Settings = require('./Settings.js')

class FilesWatcher {
	constructor(onError) {
		this._onError = onError
		this.label = FilesWatcher.name
		this._stringsToIgnoreInFiles = {}
		this._stringsToIgnoreInDirectories = {}
		this._watchingPool = {}
		
		this._watchingList = {}
		this._changedFilesList = {}
		this._delayTimeout = false
		this._delayInterval = false
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
	
	watch(path) {
		this._rewatchOnDeleteAndMkDirAgain(path)
		this._includeSubdirectoriesToWatch(path)
		this._watch(path)
	}
	
	_watch(path, onNew) {
		const directory = this._safePath(path)
		if (this._isDirectoryExist(directory)) {
			if (this._watchingList[directory]) {
				this._watchingList[directory].close()
			}
			this._watchingList[directory] = fs.watch(directory, (eventType, fileName) => {
				let path = directory + fileName
				if (this._isDirectoryExist(path)) {
					this._watch(path, true)
					this._includeSubdirectoriesToWatch(path)
				} else {
					if (this._isFileExist(path)) {
						if (!this._isItToIgnore(directory, fileName)) {
							this._onFileChange(directory, fileName)
						}
					}
				}
			})
		}
	}
	
	_rewatchOnDeleteAndMkDirAgain(path) {
		const directory = this._safePath(path)
		const stepUpDirectory = (directory + '').replace(/^(.+\/)[^\/]+\/$/, '$1')
		if (stepUpDirectory !== directory) {
			if (this._isDirectoryExist(stepUpDirectory)) {
				fs.watch(stepUpDirectory, (eventType, fileName) => {
					let maybeTheDirectory = this._safePath(stepUpDirectory + fileName)
					if (maybeTheDirectory === directory) {
						this._watch(directory)
					}
				})
			}
		}
	}
	
	_includeSubdirectoriesToWatch(path) {
		const directory = this._safePath(path)
		if (this._isDirectoryExist(directory)) {
			try {
				let directoriesBuffer = child_process.execSync(`find "${directory}" -type d`)
				let directoriesString = directoriesBuffer.toString()
				let directoriesList = directoriesString.split('\n')
				directoriesList.forEach(subdirectory => {
					if (subdirectory && subdirectory !== directory) {
						this._watch(subdirectory)
					}
				})
			} catch (e) {}
		}
	}
	
	_isDirectoryExist(path) {
		let type = this._getType(path)
		if (type === 'directory') {
			return true
		}
	}
	_isFileExist(path) {
		let type = this._getType(path)
		if (type === 'file') {
			return true
		}
	}
	
	_getType(path) {
		try {
			const isExistingDirectory = fs.statSync(path).isDirectory()
			if (isExistingDirectory) {
				return 'directory'
			} else {
				return 'file'
			}
		} catch (e) {}
	}
	
	_onFileChange(directory, fileName) {
		this._changedFilesList[directory + fileName] = { directory, fileName }
		if (this._delayTimeout) {
			clearTimeout(this._delayTimeout)
		}
		this._delayTimeout = setTimeout(() => {
			this._onFilesHasFinishedToChange()
		}, Settings.filesWatcherDelay)
	}
	_onFilesHasFinishedToChange() {
		let fileList = Object.keys(this._changedFilesList)
		if (fileList.length > Settings.filesWatcherLimit) {
			this._replyFileChange()
			this._replyFileChange(fileList.length - 1)
			this._changedFilesList = {}
		} else {
			if (this._delayInterval) {
				clearInterval(this._delayInterval)
			}
			this._delayInterval = setInterval(() => {
				this._replyFileChange()
				let fileList = Object.keys(this._changedFilesList)
				if (!fileList.length) {
					clearInterval(this._delayInterval)
				}
			}, Settings.filesWatcherDelay / 10)
		}
	}
	_replyFileChange(i) {
		if (!i) {
			i = 0
		}
		let fileList = Object.keys(this._changedFilesList)
		if (fileList.length > i) {
			let { directory, fileName } = this._changedFilesList[fileList[i]]
			if (this._isFileExist(fileList[i])) {
				this._fileHasBeenChanged(directory, fileName)
			}
			delete this._changedFilesList[fileList[i]]
		}
	}
	
	_safePath(path) {
		return (path + '/').replace(/[\/]+/g, '/')
	}
	
	_isItToIgnore(directory, fileName) {
		let ignore = this._isFileToIgnore(directory, fileName)
		if (!ignore) {
			ignore = this._isInDirectoryToIgnore(directory)
		}
		return ignore
	}
	_isFileToIgnore(directory, fileName) {
		let ignore = false
		Object.keys(this._stringsToIgnoreInFiles).some(ignoreString => {
			if (ignoreString.includes('/')) {
				if ((directory + fileName).includes(ignoreString)) {
					ignore = true
					return true
				}
			} else {
				if ((fileName + '').includes(ignoreString)) {
					ignore = true
					return true
				}
			}
		})
		return ignore
	}
	_isInDirectoryToIgnore(path) {
		const directory = this._safePath(path)
		let ignore = false
		Object.keys(this._stringsToIgnoreInDirectories).some(ignoreString => {
			if (directory.includes(ignoreString)) {
				ignore = true
				return true
			}
		})
		return ignore
	}
	
	
	/////////////////////  deprecated  /////////////////////////////////////
	
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
	
	getList(path, selectiveRegExp) {
		let cmd = `find ${path} -type f`
		return new Promise(success => {
			child_process.exec(cmd, (error, stdin, stdout) => {
				if (!error) {
					let suitableFiles = []
					let fileList = stdin.toString().trim().split('\n')
					for (let i = 0; i < fileList.length; i++) {
						let fileString = (fileList[i] + '').replace(/[\/]+/g, '/')
						let isFiltered = true
						if (selectiveRegExp) {
							if (!(new RegExp(selectiveRegExp)).test(fileString)) {
								isFiltered = false
							}
						}
						if (isFiltered) {
							let regExp = /^(.+\/)([^\/]+)$/
							let directory = fileString.replace(regExp, '$1')
							let fileName = fileString.replace(regExp, '$2')
							let directoryIgnore = this._checkForIgnoreness(directory, true)
							let fileIgnore = this._checkForIgnoreness(fileName)
							if (!fileIgnore) {
								fileIgnore = this._checkForIgnoreness(fileString)
							}
							if (!directoryIgnore && !fileIgnore) {
								suitableFiles.push(fileString)
							}
						}
					}
					success(suitableFiles)
				} else {
					this._onError(this.label, 'this.o.child_process.exec', error)
				}
				success()
			})
		}).catch(error => {
			this._onError(this.label, 'getList', error)
		})
	}
	
	_watching(directory) {
		if (this._watchingPool[directory]) {
			this._watchingPool[directory].close()
		}
		this._watchingPool[directory] = fs.watch(directory, (eventType, fileName) => {
			let fileString = (directory + '/' + fileName).replace(/[\/]+/g, '/')
			let ignore = this._checkForIgnoreness(fileName)
			if (!ignore) {
				ignore = this._checkForIgnoreness(fileString)
			}
			if (!ignore) {
				let hasDot = (fileName.split('.').length > 1)
				let isRsyncTemp = (fileName.startsWith('.') && fileName.split('.').length > 2)
				if (hasDot && !isRsyncTemp) {
					this._whenFileHasBeenChanged(directory, fileName, eventType)
				} else {
					try {
						let isDirectory = fs.lstatSync(fileString).isDirectory()
						if (isDirectory) {
							this.watchPath(fileString)
						}
					} catch(e) {
						let tempFiles = 'areVeryQuickToVanish'
					}
				}
			}
		})
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
		// let isTooMuch = (array.length > Settings.filesWatcherLimit)
		// let uniqueDirectoriesObject = {}
		array.forEach(key => {
			let { directory, fileName, eventType } = tempObject[key]
			// uniqueDirectoriesObject[directory] = { fileName, eventType }
			// if (!isTooMuch) {
				this._filesHaveBeenChangedDelay(directory, fileName, eventType)
			// }
		})
		// if (isTooMuch) {
			// let uniqueDirectories = Object.keys(uniqueDirectoriesObject)
			// this._filesHaveBeenChangedCount = Settings.filesWatcherLimit
			// uniqueDirectories.forEach(directory => {
				// let { fileName, eventType } = uniqueDirectoriesObject[directory]
				// this._filesHaveBeenChangedDelay(directory, fileName, eventType)
			// })
			// if (this._filesHaveBeenChangedCount >= Settings.filesWatcherLimit) {
				// this._filesHaveBeenChangedCount -= Settings.filesWatcherLimit
			// } else {
				// this._filesHaveBeenChangedCount = 0
			// }
		// }
	}
	
	_filesHaveBeenChangedDelay(directory, fileName, eventType) {
		this._filesHaveBeenChangedCount++
		setTimeout(() => {
			this._filesHaveBeenChangedCount--
			if (this._fileHasBeenChanged) {
				this._fileHasBeenChanged(directory, fileName, eventType)
			}
		}, Settings.filesWatcherDelay * this._filesHaveBeenChangedCount)
	}
	
	_allDirectories(path) {
		return new Promise(success => {
			let cmd = `find "${path}" -type d`
			child_process.exec(cmd, (error, stdin, stdout) => {
				if (error) {
					let noSuch = 'No such file or directory'
					let notAnError = (typeof error === 'object' && (error.message + '').includes(noSuch))
					if (!notAnError) {
						this._onError(this.label, '_allDirectories child_process', error)
					}
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