const fs = require('fs')
const FileHandler = require('../../../_common/FileHandler.js')
const Logger = require('../../../_common/Logger.js')
const Settings = require('../../../_common/Settings.js')

class LogsHandler {
	constructor(onError, redis) {
		this.onError = onError
		this.redis = redis
		this.label = this.constructor.name
		this.loggerLabel = 'Logger'
		this.commonLabel = 'commonInfo'
		let labelPath = '/usr/nodejs/sda/' + process.env.STAGE + '/' + process.env.LABEL
		let propsFileString = labelPath + '/subsections/logs/stageSensitive/props.json'
		this.propsFileHandler = new FileHandler(this.onError, propsFileString)
	}
	
	async getProps() {
		return await this.propsFileHandler.objectFromFile()
	}
	
	async setProps() {
		try {
			return await this._setProps()
		} catch(error) {
			this._onError('setProps', error)
		}
	}
	
	// localLog(string) {
		// // tail -f -n 100 /mnt/sda/development/site/subsections/logs/stageSensitive/local.log
		// let date = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().replace(/[TZ]/g, ' ')
		// this.localLogsFileHandler.addToFile(date + string + '\n')
	// }
	
	async recoveryProps() {
		try {
			let props = await this.getProps()
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
			this.domain = await this.redis.hget(this.commonLabel, 'domain')
			this.ip = await this.redis.hget(this.commonLabel, 'currentIp')
			this.logs = await this._getByType(this.loggerLabel + ':logs')
			this.errors = await this._getByType(this.loggerLabel + ':errors')
			this._composeProps()
			let ok = await this.propsFileHandler.objectToFile(this.props)
			return ok
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
	
	async _recovery(logger, object, type) {
		try {
			if (typeof object === 'object') {
				let dateArray = Object.keys(object)
				let start = 0
				if (dateArray.length > 1000) {
					start = dateArray.length - 1000
				}
				for (let i = start; i < dateArray.length; i++) {
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