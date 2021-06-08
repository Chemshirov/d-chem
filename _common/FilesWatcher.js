const child_process = require('child_process')
const fs = require('fs')

class FilesWatcher {
	constructor(onError) {
		this._onError = onError
		this.label = FilesWatcher.name
		this._stringsToIgnoreInFiles = {}
		this._stringsToIgnoreInDirectories = {}
	}
	
	addStringToIgnore(string, isInDirectories) {
		if (!!isInDirectories) {
			this._stringsToIgnoreInDirectories[string] = true
		} else {
			this._stringsToIgnoreInFiles[string] = true
		}
	}
	
	onFileChanged(callback) {
		if (typeof callback === 'function') {
			this._fileHasChanged = callback
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
		fs.watch(directory, (eventType, fileName) => {
			let ignore = this._checkForIgnoreness(fileName)
			if (!ignore) {
				this._whenFileHasChanged(directory, fileName)
			}
		})
	}
	
	_whenFileHasChanged(directory, fileName) {
		if (this._whenFileHasChangedST) {
			clearTimeout(this._whenFileHasChangedST)
		}
		this._whenFileHasChangedST = setTimeout(() => {
			if (this._fileHasChanged) {
				this._fileHasChanged(directory, fileName)
			}
		}, 100)
	}
	
	_allDirectories(path) {
		return new Promise(success => {
			let cmd = `find ${path} -type d`
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