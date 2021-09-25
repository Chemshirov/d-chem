const Main = require('./server/Main.js')
const Starter = require('../../../_common/Starter.js')

class Git extends Starter {
	constructor(currentPath) {
		super()
		this.currentPath = currentPath
		this.label = this.constructor.name
	}
	
	async atStart() {
		try {
			this._setUnhandledErrorsHandler()
			this.main = new Main(this.onError.bind(this), this.log, this.rabbitMQ)
			await this.main.start()
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