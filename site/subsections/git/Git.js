const Main = require('./server/Main.js')
const Settings = require('../../../_common/Settings.js')
const Starter = require('../../../_common/Starter.js')

class Git extends Starter {
	constructor(currentPath) {
		super()
		this.currentPath = currentPath
		this.label = this.constructor.name
	}
	
	async atStart() {
		try {
			await this.getDomainAndIps()
			this.main = new Main(this.onError.bind(this), this.log, this.rabbitMQ, this.domain, this.label)
			await this.main.start()
			let rabbitHostName = Settings.developmentStageName.substring(0, 1) + '-rabbitmq'
			this.rabbitMQ.send({
				rabbitHostName,
				label: 'Playwright',
				takeScreenshot: true,
				url: 'https://' + this.domain + '/' + this.label.toLowerCase(),
				path: Settings.subsectionsPath + this.label.toLowerCase() + '/stageSensitive/ogImage.png',
			})
			this.rabbitMQ.send({
				rabbitHostName,
				label: 'Playwright',
				pathToTests: this.currentPath + 'tests',
			})
		} catch (err) {
			this.onError(this.label, 'atStart', err)
		}
	}
	
	_setUnhandledErrorsHandler() {
		process.on('unhandledRejection', (error, promise) => {
			this.onError(this.label, 'unhandledRejection', error)
		})
		process.on('uncaughtException', (error) => {
			if (error && error.code !== 'ECONNREFUSED') {
				this.onError(this.label, 'uncaughtException', {
					errorString: error.toString(),
					errorJSON: JSON.stringify(error)
				})
			}
		})
	}
}

module.exports = Git