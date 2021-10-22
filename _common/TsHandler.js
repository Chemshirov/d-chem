const child_process = require('child_process')
const FilesWatcher = require('./FilesWatcher.js')

class TsHandler {
	constructor(onError, log) {
		this.onError = onError
		this.log = log
		this.label = this.constructor.name
		this._excludeDirectories = []
		
		this.filesWatcher = new FilesWatcher(this.onError)
	}
	
	set tsDirectory(directory) {
		this._tsDirectory = directory
	}
	
	set jsDirectory(directory) {
		this._jsDirectory = directory
	}
	
	set excludeDirectories(directoryArray) {
		this._excludeDirectories = directoryArray
	}
	
	set excludeFiles(fileStringChunk) {
		if (!this._excludeFiles) {
			this._excludeFiles = {}
		}
		this._excludeFiles[fileStringChunk] = true
	}
	
	async convertOnce() {
		try {
			this._setFilesWatcherIgnoreness()
			let selectiveRegExp = /\.ts$/
			let list = await this.filesWatcher.getList(this._tsDirectory, selectiveRegExp)
			let include = list.join(' ')
			let postfix = `--outDir ${this._jsDirectory} ${include}`
			await this._executeTsc(postfix)
		} catch (error) {
			this.onError(this.label, 'convertOnce', error)
		}
	}
	
	async watch() {
		try {
			this._setFilesWatcherIgnoreness()
			this.filesWatcher.onFileChanged(this._tscConvertsFile.bind(this))
			await this.filesWatcher.watchPath(this._tsDirectory)
		} catch (error) {
			this.onError(this.label, 'convertOnce', error)
		}
	}
	
	_setFilesWatcherIgnoreness() {
		if (this._excludeDirectories) {
			this._excludeDirectories.forEach(directory => {
				let directoryChunk = directory.replace(/^\./, '')
				this.filesWatcher.addStringToIgnore(directoryChunk, true)
			})
		}
		if (this._excludeFiles) {
			Object.keys(this._excludeFiles).forEach(fileStringChunk => {
				this.filesWatcher.addStringToIgnore(fileStringChunk)
			})
		}
	}
	
	_tscConvertsFile(directory, fileName) {
		return new Promise(success => {
			if (fileName.endsWith('.ts')) {
				directory = this._addSlash(directory)
				let tsFileString = directory + fileName
				let from = this._addSlash(this._tsDirectory)
				let to = this._addSlash(this._jsDirectory)
				let assetsDirectory = directory.replace(from, to)
				let assetsFileName = fileName.replace(/\.ts$/, '.js')
				let assetsFileString = assetsDirectory + assetsFileName
				if (assetsFileString !== tsFileString) {
					let postfix = `--outDir ${assetsDirectory} ${tsFileString}`
					this._executeTsc(postfix).then(() => {
						success()
					})
				} else {
					success()
				}
			} else {
				success()
			}
		}).catch(error => {
			this.onError(this.label, '_tscConvertsFile ' + directory + ' ' + fileName, error)
		})
	}
	
	_executeTsc(postfix) {
		return new Promise(success => {
			let argumentsLines = `
				--target ES2020
				--module CommonJS
				--strict true
				--moduleResolution Node
			`
			argumentsLines += ' --excludeDirectories "' + this._excludeDirectories.join(', ') + '" '
			argumentsLines = argumentsLines.replace(/[\t\n]+/g, ' ').replace(/[  ]+/g, ' ')
			let cmd = 'tsc ' + argumentsLines + ' ' + postfix
			child_process.exec(cmd, (error, stdin, stdout) => {
				let tsErrorString = stdin.toString().trim()
				if (tsErrorString) {
					let errorCount = tsErrorString.split('\n').length
					this.onError(this.label, 'Tsc error(s): ' + errorCount, tsErrorString.substring(0, 512))
				}
				success()
			})
		}).catch(error => {
			this.onError(this.label, '_executeTsc ' + postfix, error)
		})
	}
	
	_addSlash(directory) {
		if (!directory.endsWith('/')) {
			directory += '/'
		}
		return directory
	}
}

module.exports = TsHandler