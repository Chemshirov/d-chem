const fs = require('fs')
const Logger = require('../../../_common/Logger.js')
const Settings = require('../../../_common/Settings.js')

class LogsHandler {
	constructor(onError, redis) {
		this.onError = onError
		this.redis = redis
		this.label = this.constructor.name
		this.loggerLabel = 'Logger'
		this.commonLabel = 'commonInfo'
		let path = '/usr/nodejs/sda/' + process.env.STAGE + '/' + process.env.LABEL + '/subsections/logs/'
		let fileName = 'props.json'
		this.propsFileString = path + fileName
	}
	
	async getProps() {
		return await this._propsFromFile()
	}
	
	async setProps() {
		try {
			await this._setProps()
		} catch(error) {
			this._onError('setProps', error)
		}
	}
	
	async recoveryProps() {
		try {
			let props = await this._propsFromFile()
			if (props) {
				let logger = new Logger()
				await logger.initiate()
				await this._recovery(logger, props.logs, 'logs')
				await this._recovery(logger, props.errors, 'errors')
			}
		} catch(error) {
			this._onError('recoveryProps', error)
		}
	}
	
	async _setProps() {
		try {
			if (this.redis) {
				this.domain = await this.redis.hget(this.commonLabel, 'domain')
				this.ip = await this.redis.hget(this.commonLabel, 'currentIp')
				this.logs = await this._getByType(this.loggerLabel + ':logs')
				this.errors = await this._getByType(this.loggerLabel + ':errors')
				this._composeProps()
				let ok = await this._propsToFile()
				return ok
			}
		} catch(error) {
			this._onError('_setProps', error)
		}
	}
	
	async _getByType(label) {
		try {
			let object = {}
			let logs = await this.redis.hgetall(label)
			if (logs) {
				Object.keys(logs).forEach(date => {
					this._updateMaxDate(date)
					let data = logs[date]
					try {
						object[date] = JSON.parse(data)
					} catch(e) {}
				})
			}
			return object
		} catch(error) {
			this._onError('_getByType', error)
		}
	}
	
	_updateMaxDate(date) {
		if (!this._maxDate) {
			this._maxDate = ''
		}
		if (date > this._maxDate) {
			this._maxDate = date
		}
	}
	
	_composeProps() {
		this.props = {
			domain: this.domain || '',
			ip: this.ip || 'IP',
			prefix: process.env.PREFIX,
			logs: this.logs || {},
			errors: this.errors || {},
			lastDate: this._maxDate || new Date(0).toISOString().replace(/[tz]/gi, ' ').trim(),
			revalidate: Settings.nextJsRevalidateSecs,
			error: false
		}
	}
	
	_propsToFile() {
		return new Promise(success => {
			let string = JSON.stringify(this.props)
			if (this.lastString !== string) {
				this.lastString = string
				let tempFileString = this.propsFileString + '.' + Date.now() + '.temp'
				fs.writeFile(tempFileString, string, error => {
					if (!error) {
						fs.rename(tempFileString, this.propsFileString, error => {
							if (!error) {
								fs.chown(this.propsFileString, 1000, 1000, error => {
									if (!error) {
										success(true)
									} else {
										this._onError('_propsToFile chown', error)
									}
								})
							} else {
								this._onError('_propsToFile rename', error)
							}
						})
					} else {
						this._onError('_propsToFile writeFile', error)
					}
				})
			} else {
				success(false)
			}
		}).catch(error => {
			this._onError('_propsToFile catch', error)
		})
	}
	
	_propsFromFile() {
		return new Promise(success => {
			fs.readFile(this.propsFileString, (error, data) => {
				if (!error) {
					try {
						let props = JSON.parse(data)
						success(props)
					} catch (error) {
						this._onError('_propsFromFile JSON.parse', error)
					}
				} else {
					this._onError('_propsFromFile readFile', error)
				}
			})
		}).catch(error => {
			this._onError('_propsFromFile catch', error)
		})
	}
	
	async _recovery(logger, object, type) {
		try {
			if (typeof object === 'object') {
				let dateArray = Object.keys(object)
				for (let i = 0; i < dateArray.length; i++) {
					let date = dateArray[i]
					let value = object[date]
					let string = JSON.stringify(value)
					await logger.addToRedis(date, type, string)
				}
			}
		} catch(error) {
			this._onError('_recovery', error)
		}
	}
	
	_onError(method, error) {
		if (this.onError) {
			this.onError(this.label, method, error)
		} else {
			let jsonError = JSON.stringify(error)
			let stringError = error.toString()
			this.error = { className: this.label, method, jsonError, stringError }
		}
	}
}

module.exports = LogsHandler