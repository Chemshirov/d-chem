const child_process = require('child_process')
const Redis = require('../../_common/Redis.js')
const Settings = require('../../_common/Settings.js')

class ArbiterTime { 
	constructor(onError) {
		this._onError = onError
		this.label = this.constructor.name
	}
	
	async init() {
		try {
			let redis = new Redis(this._onError)
			this.redis = await redis.connect()
			await this._startInternetUpTime()
		} catch(error) {
			this._onError(this.label, 'init', error)
		}
	}
	
	async _startInternetUpTime() {
		try {
			await this._setInternetUpTime()
			if (this._internetUpTimeSI) {
				clearInterval(this._internetUpTimeSI)
			}
			this._internetUpTimeSI = setInterval(() => {
				this._setInternetUpTime()
			}, Settings.arbiterTimeInterval)
		} catch(error) {
			this._onError(this.label, '_startInternetUpTime', error)
		}
	}
	
	async _setInternetUpTime() {
		try {
			let array = Settings.arbiterTimeSiteList
			let internetWorks = false
			for (let i = 0; i < array.length; i++) {
				let site = array[i]
				let cmd = `wget --spider ${site}`
				let ok = await this._isInternetWork(cmd)
				if (ok) {
					internetWorks = true
					await this._writeToRedis('internetWorks', Date.now())
					break
				}
			}
			if (!internetWorks && this.redis) {
				let lastTimeInternetWorked = await this.redis.hget(this.label, 'internetWorks')
				await this._writeToRedis('lastTimeInternetWorked', lastTimeInternetWorked)
				let now = Date.now()
				await this._writeToRedis('noInternet', now)
				await this._writeToRedis('internetBreach', now)
			}
		} catch(error) {
			this._onError(this.label, '_setInternetUpTime', error)
		}
	}
	
	_isInternetWork(cmd) {
		return new Promise(success => {
			let ok = false
			child_process.exec(cmd, (err, stdin, stdout) => {
				if (!err) {
					let result = stdout.toString().replace(/[\r\n\t]/g, '')
					if (result && (/exists/).test(result)) {
						if (!ok && !!success) {
							ok = true
							success(true)
						}
					}
				}
			})
			setTimeout(() => {
				if (!ok && !!success) {
					ok = true
					success(false)
				}
			}, Settings.standardTimeout)
		}).catch(error => {
			this._onError(this.label, '_isInternetWork', error)
		})
	}
	
	async _writeToRedis(key, value) {
		try {
			if (this.redis) {
				await this.redis.hset(this.label, key, value)
			}
		} catch(error) {
			this._onError(this.label, '_writeToRedis', error)
		}
	}
}

module.exports = ArbiterTime