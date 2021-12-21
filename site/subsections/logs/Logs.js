const childProcess = require('child_process')
const LogsHandler = require('./LogsHandler.js')
const Settings = require('../../../_common/Settings.js')
const Starter = require('../../../_common/Starter.js')
const Websockets = require('./Websockets.js')

class Logs extends Starter {
	constructor(currentPath) {
		super()
		this.currentPath = currentPath
		this.label = this.constructor.name
		this.rabbitHostName = Settings.developmentStageName.substring(0, 1) + '-rabbitmq'
	}
	
	async atStart() {
		try {
			await this.rabbitMQ.receive(this._onReceive.bind(this))
			this.logsHandler = new LogsHandler(this.onError.bind(this), this.redis)
			await this.logsHandler.recoveryProps()
			await this.logsHandler.setProps()
			this.pathToNextDirectory = this.currentPath + '.next'
			let websockets = new Websockets(this.onError.bind(this), this.label.toLowerCase())
			await websockets.start()
			await this.getDomainAndIps()
			if (!process.env.SHOW || process.env.STAGE === Settings.productionStageName) {
				await this._spawn('rm -rf ' + this.currentPath + '.next')
				await this._spawn('next build')
				await this._spawn('next start -p ' + Settings.port)
				this._takeScreenshot()
				this._revalidateKicker()
			} else {
				await this._spawn('next dev -p ' + Settings.port)
				this._spawn('tsc --noEmit')
				this.rabbitMQ.send({
					rabbitHostName: this.rabbitHostName,
					label: 'Playwright',
					pathToTests: this.currentPath + 'tests'
				})
			}
		} catch (error) {
			this.onError(this.label, 'atStart', error)
		}
	}
	
	_spawn(cmd, quite) {
		return new Promise(success => {
			let newProcess = childProcess.spawn(`cd ${this.currentPath} && ${cmd}`, {shell: true})
			newProcess.stdout.on('data', data => {
				let infoString = data.toString().trim()
				if (!quite) {
					if (infoString.length > 1) {
						if (!infoString.includes('error TS')) {
							this.log(infoString)
						} else {
							this._tsErrors(infoString)
						}
					}
				}
				if (infoString.includes('ready - started server on')) {
					success()
				}
			})
			newProcess.stderr.on('data', error => {
				if (!quite) {
					let errorString = error.toString()
					if (!errorString.startsWith('warn') || errorString.includes('Warning')) {
						this.log(errorString)
					} else {
						if (errorString.length > 2) {
							this.onError(this.label, '_spawn ' + cmd, errorString)
						}
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
	
	async _revalidateKicker() {
		try {
			// For rebuild: at least one client must refresh the page
			// every 'revalidate' amount of seconds plus little more
			// to NextJs starts to check getStaticProps() and rebuild content.
			// Otherwise NextJs does nothing.
			let time = Settings.nextJsRevalidateSecs * 1000
			setTimeout(() => {
				this._setPropsAndTest()
				setInterval(() => {
					this._setPropsAndTest()
				}, time / 3)
			}, time / 3)
		} catch (error) {
			this.onError(this.label, '_revalidateKicker', error)
		}
	}
	
	async _setPropsAndTest() {
		try {
			let hasNews = await this.logsHandler.setProps()
			if (hasNews) {
				this._takeScreenshot()
			}
		} catch (error) {
			this.onError(this.label, '_setPropsAndTest catch', error)
		}
	}
	
	_takeScreenshot() {
		this.rabbitMQ.send({
			rabbitHostName: this.rabbitHostName,
			label: 'Playwright',
			takeScreenshot: true,
			url: 'https://' + this.domain + '/' + this.label.toLowerCase(),
			path: Settings.subsectionsPath + this.label.toLowerCase() + '/stageSensitive/ogImage.png',
		})
	}
	
	_tsErrors(infoString) {
		if (!this._showTsErrorsFirstString) {
			this._showTsErrorsFirstString = infoString
		}
		if (!this._showTsErrorsCount) {
			this._showTsErrorsCount = 0
		}
		this._showTsErrorsCount++
		if (this._showTsErrorsST) {
			clearTimeout(this._showTsErrorsST)
		}
		this._showTsErrorsST = setTimeout(() => {
			this.onError(this.label, '_tsErrors', this._showTsErrorsFirstString)
			this.log('Ts error count: ' + this._showTsErrorsCount)
		}, Settings.filesWatcherDelay)
	}
	
	_onReceive(object) {
		if (object.label === 'oldData') {
			if (object.type === 'longTimeNoSee') {
				this.log({
					label: 'Data',
					data: ['longTimeNoSee', object.userType, object.uid.substring(28), object.uid.substring(4,18)]
				})
			}
		}
	}
}

module.exports = Logs