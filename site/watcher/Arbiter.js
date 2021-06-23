const ArbiterTime = require('./ArbiterTime.js')
const child_process = require('child_process')
const Redis = require('../../_common/Redis.js')
const siteSettings = require('/usr/nodejs/sda/' + process.env.STAGE + '/' + process.env.LABEL + '/Settings.js')
const Settings = require('../../_common/Settings.js')
const Syncer = require('./Syncer.js')

class Arbiter {
	constructor(onError, rabbitMQ) {
		this.onError = onError
		this.rabbitMQ = rabbitMQ
		this.label = this.constructor.name
	}
	
	async init() {
		try {
			await new ArbiterTime(this.onError).init()
			this.currentIp = await siteSettings.getCurrentIp()
			this.anotherIp = siteSettings.getAnotherIp(this.currentIp)
			await this._setRedisInstances()
			await this.currentRedis.hset(this.label, 'currentIp', this.currentIp)
			await this.currentRedis.hset(this.label, 'anotherIp', this.anotherIp)
			await this._choosing()
			this._setChoosingInterval()
		} catch(error) {
			this.onError(this.label, 'init', error)
		}
	}
	
	async _choosing() {
		try {
			if (await this._isInternetWorks()) {
				if (await this._isAnotherRedisConnected()) {
					if (await this._wasMasterLastTime()) {
						if (await this._wasInternetBreach()) {
							await this._becomeSlave()
						} else {
							await this._becomeMaster()
						}
					} else {
						await this._becomeSlave()
					}
				} else {
					await this._becomeMaster()
				}
			} else {
				await this._becomeSlave()
			}
		} catch(error) {
			this.onError(this.label, '_choosing', error)
		}
	}
	
	async _becomeMaster() {
		try {
			let ok = await this._become('master')
			if (ok) {
				await this._hsetToBoth('masterIp', this.currentIp)
				await this._hsetToBoth('slaveIp', this.anotherIp)
				await this._hsetToBoth('masterDate', Date.now())
			}
		} catch(error) {
			this.onError(this.label, '_becomeMaster', error)
		}
	}
	
	async _becomeSlave() {
		try {
			let ok = await this._become('slave')
			if (ok && !this._copying) {
				this._copying = true
				let syncer = new Syncer(this.onError, this.rabbitMQ)
				await syncer.copyToSlave()
				if (this._isPredispositionalMaster) {
					this._becomeMaster()
				}
				this._copying = false
			}
		} catch(error) {
			this.onError(this.label, '_becomeSlave', error)
		}
	}
	
	async _become(type) {
		let ok = false
		if (await this._wasInternetBreach()) {
			await this.currentRedis.hdel(ArbiterTime.name, 'internetBreach')
			this.rabbitMQ.sendToAll('reconnectToRedis')
			ok = true
		}
		if (this._lastBecoming !== type) {
			this._lastBecoming = type
			let data = 'I am ' + type
			this.rabbitMQ.send('logger', {type: 'log', label: process.env.HOSTNAME, data})
			console.log(data)
			ok = true
		}
		if (ok) {
			return ok
		}
	}
	
	async _isInternetWorks() {
		try {
			return await this._isHealthy(this.currentRedis)
		} catch(error) {
			this.onError(this.label, '_isInternetWorks', error)
		}
	}
	
	async _isAnotherRedisConnected() {
		try {
			await this._setAnotherRedis()
			let isConnected = false
			if (this.anotherRedis) {
				isConnected = await this._isHealthy(this.anotherRedis)
			}
			return isConnected
		} catch(error) {
			this.onError(this.label, '_isAnotherRedisConnected', error)
		}
	}
	
	_isHealthy(redis) {
		return new Promise(success => {
			try {
				let internetWorksPromise = redis.hget(ArbiterTime.name, 'internetWorks').catch(redis.onCatch)
				internetWorksPromise.then(date => {
					if ((Date.now() - date) <= Settings.arbiterTimeInterval * 2) {
						success(true)
					} else {
						success(false)
					}
				}).catch(err => {
					success(false)
				})
			} catch(err) {
				success(false)
			}
		}).catch(error => {
			this.onError(this.label, '_isHealthy', error)
		})
	}
	
	async _wasMasterLastTime() {
		try {
			let masterIpByCurrent = await this.currentRedis.hget(this.label, 'masterIp')
			let masterIpByAnother = false
			if (this.anotherRedis) {
				masterIpByAnother = await this.anotherRedis.hget(this.label, 'masterIp').catch(this.anotherRedis.onCatch)
			}
			let masterIp = masterIpByCurrent || masterIpByAnother
			if (masterIpByCurrent && masterIpByAnother && masterIpByCurrent !== masterIpByAnother) {
				let masterDateByCurrent = await this.currentRedis.hget(this.label, 'masterDate')
				let masterDateByAnother = 0
				if (this.anotherRedis) {
					masterDateByAnother = await this.anotherRedis.hget(this.label, 'masterDate')
				}
				let isCurrentMasterFresher = (masterDateByCurrent>>>0 > masterDateByAnother>>>0)
				masterIp = (isCurrentMasterFresher ? masterIpByCurrent : masterIpByAnother)
			}
			if (!masterIp) {
				masterIp = siteSettings.predispositionalMasterIp
			}
			return (masterIp === this.currentIp)
		} catch(error) {
			this.onError(this.label, '_wasMasterLastTime', error)
		}
	}
	
	async _wasInternetBreach() {
		try {
			return !!(await this.currentRedis.hget(ArbiterTime.name, 'internetBreach'))
		} catch(error) {
			this.onError(this.label, '_wasInternetBreach', error)
		}
	}
	
	get _isPredispositionalMaster() {
		return (this.currentIp === siteSettings.predispositionalMasterIp)
	}
	
	async _setRedisInstances() {
		try {
			let currentRedis = new Redis(this.onError)
			this.currentRedis = await currentRedis.connect(this.currentIp)
			if (this.currentRedis) {
				await this._setAnotherRedis()
			}
		} catch(error) {
			this.onError(this.label, '_setRedisInstances', error)
		}
	}
	
	async _setAnotherRedis() {
		try {
			if (this.anotherRedis) {
				this.anotherRedis.disconnect()
			}
			let redis = new Redis(this.onError)
			this.anotherRedis = await redis.connect(this.anotherIp, true)
		} catch(error) {
			this.onError(this.label, '_setAnotherRedis', error)
		}
	}
	
	async _hsetToBoth(key, value) {
		try {
			await this.currentRedis.hset(this.label, key, value).catch(this.currentRedis.onCatch)
			if (this.anotherRedis) {
				await this.anotherRedis.hset(this.label, key, value).catch(this.anotherRedis.onCatch)
			}
		} catch(error) {
			this.onError(this.label, '_writeHsetToBoth', error)
		}
	}
	
	_setChoosingInterval() {
		setInterval(() => {
			this._choosing()
		}, Settings.arbiterChoosingInterval)
	}
}

module.exports = Arbiter