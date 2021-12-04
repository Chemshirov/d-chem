const fs = require('fs')
const childProcess = require('child_process')
const Settings = require('./Settings.js')

class NextHandler {
	constructor(object, projectPath) {
		this.onError = object.onError
		this.log = object.log
		this.rabbitMQ = object.rabbitMQ
		this.domain = object.domain
		this.mainLabel = object.label
		this.projectPath = projectPath
		this.label = this.constructor.name
		this.isTscWorking = false
		this.rabbitHostName = Settings.developmentStageName.substring(0, 1) + '-rabbitmq'
	}
	
	async start() {
		try {
			if (!process.env.SHOW || process.env.STAGE === Settings.productionStageName) {
				await this._spawn('rm -rf ' + this.projectPath + '.next')
				await this._spawn('next build')
				await this._spawn('next start -p ' + Settings.port)
				this._takeScreenshots()
			} else {
				await this._spawn('next build')
				await this._spawn('next dev -p ' + Settings.port)
				await this._tsc()
				this.rabbitMQ.receive({ label: 'Watcher', callback: this._onWatcher.bind(this) })
				this.rabbitMQ.send({
					rabbitHostName: this.rabbitHostName,
					label: 'Playwright',
					pathToTests: this.projectPath + 'tests'
				})
			}
		} catch (error) {
			this.onError(this.label, 'start', error)
		}
	}
	
	_spawn(cmd) {
		return new Promise(success => {
			let newProcess = childProcess.spawn(`cd ${this.projectPath} && ${cmd}`, {shell: true})
			newProcess.stdout.on('data', data => {
				let infoString = data.toString().trim()
				if (infoString.length > 1) {
					if (infoString.startsWith('error - ')) {
						this.onError(this.label, '_spawn next', error)
					} else if (infoString.includes('error TS')) {
						this._showTsErrors(infoString)
					} else {
						this.log(infoString)
					}
				}
				if (infoString.includes('ready - started server on')) {
					success()
				}
			})
			newProcess.stderr.on('data', error => {
				let errorString = error.toString()
				if (!errorString.startsWith('warn') || errorString.includes('Warning')) {
					this.log(errorString)
				} else {
					if (errorString.length > 2) {
						this.onError(this.label, '_spawn ' + cmd, errorString)
					}
				}
			})
			newProcess.on('close', () => {
				success()
			})
		}).catch(error => {
			this.onError(this.label, '_spawn', error)
		})
	}
	
	async _onWatcher(object) {
		if (object && object.type === 'FileHasChanged') {
			if (object.directory.startsWith(this.projectPath)) {
				if (object.fileName.endsWith('ts') || object.fileName.endsWith('tsx')) {
					let tsFileString = object.directory + '/' + object.fileName
					await this._tsc(tsFileString)
				}
			}
		}
	}
	
	async _tsc(tsFileString) {
		try {
			if (!this.isTscWorking) {
				this.isTscWorking = true
				let cmd = 'tsc --noEmit'
				if (tsFileString) {
					if (tsFileString.endsWith('tsx')) {
						cmd += ' --jsx react-jsx --target es2020 --moduleResolution node'
					}
					cmd += ' ' + tsFileString
				}
				await this._spawn(cmd)
				this.isTscWorking = false
			}
		} catch (error) {
			this.onError(this.label, 'start', error)
		}
	}
	
	_takeScreenshots() {
		this._takeScreenshot()
		setInterval(() => {
			this._takeScreenshot()
		}, Settings.screenshotInterval)
	}
	
	_takeScreenshot() {
		this.rabbitMQ.send({
			rabbitHostName: this.rabbitHostName,
			label: 'Playwright',
			takeScreenshot: true,
			url: 'https://' + this.domain + '/' + this.mainLabel.toLowerCase(),
			path: Settings.subsectionsPath + this.mainLabel.toLowerCase() + '/stageSensitive/ogImage.png',
		})
	}
	
	_wget(url) {
		return new Promise(async success => {
			try {
				let cmd = `wget https://${url} -O -`
				childProcess.exec(cmd, {maxBuffer: 1024 * 1024 * 100}, (error, stdin, stdout) => {
					let resultLength = 0
					if (error) {
						this.onError(this.label, '_wget childProcess: ' + cmd, error)
					} else {
						resultLength = stdin.toString().length
						if (resultLength < 1000) {
							let error = new Error('Length < 1000 at ' + url)
							this.onError(this.label, '_wget childProcess ', error)
						}
					}
					success(resultLength)
				})
			} catch (error) {
				this.onError(this.label, '_wget catch', error)
			}
		}).catch(error => {
			this.onError(this.label, '_wget', error)
		})
	}
	
	_showTsErrors(infoString) {
		if (!this._hasToSkipTsError(infoString)) {
			if (!this._showTsErrorsFirstString) {
				this._showTsErrorsFirstString = infoString
			}
			if (!this._showTsErrorsCount) {
				this._showTsErrorsCount = 0
			}
			this._showTsErrorsCount++
		}
		if (this._showTsErrorsST) {
			clearTimeout(this._showTsErrorsST)
		}
		this._showTsErrorsST = setTimeout(() => {
			if (this._showTsErrorsCount) {
				this.log('Ts error count: ' + this._showTsErrorsCount)
				this.log(this._showTsErrorsFirstString)
			}
			this._showTsErrorsFirstString = ''
			this._showTsErrorsCount = 0
		}, Settings.filesWatcherDelay)
	}
	
	_hasToSkipTsError(infoString) {
		let skip = false
		let noModule = infoString.includes('TS2307')
		if (noModule && infoString.includes('.module.scss')) {
			skip = true
		} else if (noModule && infoString.includes('@playwright/test')) {
			skip = true
		} else if (infoString.includes('.d.ts')) {
			if (infoString.includes('TS1259') || infoString.includes('TS2688') || infoString.includes('TS2717')) {
				skip = true
			}
		}
		return skip
	}
}

module.exports = NextHandler