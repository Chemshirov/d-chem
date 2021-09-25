const ArbiterTime = require('./ArbiterTime.js')
const child_process = require('child_process')
const Redis = require('../../_common/Redis.js')
const Settings = require('../../_common/Settings.js')
const Syncer = require('./Syncer.js')

class Arbiter {
	constructor(setupObject) {
		this.onError = setupObject.onError
		this.log = setupObject.log
		this.rabbitMQ = setupObject.rabbitMQ
		this.currentIp = setupObject.currentIp
		this.anotherIp = setupObject.anotherIp
		this.predispositionalMasterIp = setupObject.predispositionalMasterIp
		this.setupObject = setupObject
		this.label = this.constructor.name
	}
	
	async init() {
		try {
			let redis = new Redis(this.onError)
			this.redis = await redis.connect()
			await new ArbiterTime(this.onError).init()
			await this.rabbitMQ.receive({ label: this.label, callback: this._onArbiter.bind(this) })
			await this._choosing()
			this._setChoosingInterval()
		} catch(error) {
			this.onError(this.label, 'init', error)
		}
	}
	
	setSyncer(syncer) {
		this.syncer = syncer
		if (this._becomeSlaveEventHappenedBeforeSyncerSet) {
			this.syncer.copyToSlave()
		}
	}
	
	async _onArbiter(object) {
		try {
			if (object.check) {
				this._sendToAnotherServer({ checked: this.anotherIp })
			} else
			if (object.checked) {
				if (object.checked === this.currentIp) {
					if (this._isAnotherServerConnectedSuccess) {
						this._isAnotherServerConnectedSuccess(true)
						if (this._isAnotherServerConnectedST) {
							clearTimeout(this._isAnotherServerConnectedST)
						}
					}
				}
			} else
			if (object.exec) {
				if (typeof this[object.exec] === 'function') {
					this[object.exec](object)
				}
			}
		} catch(error) {
			this.onError(this.label, '_onArbiter', error)
		}
	}
	
	_sendToAnotherServer(message, getNewConnection) {
		this.rabbitMQ.send({
			getNewConnection,
			rabbitHostName: this.anotherIp,
			label: this.label,
			message
		})
	}
	
	async _choosing() {
		try {
			if (await this._isInternetWorks()) {
				if (await this._isAnotherServerConnected()) {
					if (await this._wasMasterLastTime()) {
						if (await this._wasInternetBreach()) {
							await this._becomeSlave('There was internet breach')
						} else {
							await this._becomeMaster('There was no internet breach')
						}
					} else {
						await this._becomeSlave('Current server was not a master at last time')
					}
				} else {
					await this._becomeMaster('Another server has no connection')
				}
			} else {
				this.log({ label: this.label, data: 'Internet does not work' })
				await this._becomeSlave('Internet does not work, reason: ' + this._isInternetWorks.reason)
			}
		} catch(error) {
			this.onError(this.label, '_choosing', error)
		}
	}
	
	async _becomeMaster(reason) {
		try {
			let ok = await this._become('master', reason)
			if (ok) {
				let masterDate = Date.now()
				await this._setMasterInfo({
					masterIp: this.currentIp,
					slaveIp: this.anotherIp,
					masterDate
				})
				this._sendToAnotherServer({ exec: '_becomeSlave' })
			}
		} catch(error) {
			this.onError(this.label, '_becomeMaster', error)
		}
	}
	
	async _becomeSlave(reason) {
		try {
			let ok = await this._become('slave', reason)
			if (ok && !this._copying) {
				this._copying = true
				if (this.syncer) {
					this._becomeSlaveEventHappenedBeforeSyncerSet = false
					await this.syncer.copyToSlave()
				} else {
					this._becomeSlaveEventHappenedBeforeSyncerSet = true
				}
				if (this._isPredispositionalMaster) {
					this._becomeMaster('Ressurection')
				}
				this._copying = false
			}
		} catch(error) {
			this.onError(this.label, '_becomeSlave', error)
		}
	}
	
	async _become(type, reason) {
		try {
			let ok = false
			if (await this._wasInternetBreach()) {
				await this.redis.hdel(ArbiterTime.name, 'internetBreach')
				ok = true
			}
			if (this._lastBecoming !== type) {
				let data = {
					text: 'I am ' + type,
					reason: reason
				}
				this._lastBecoming = type
				this.log({ label: this.label, data })
				ok = true
			}
			if (ok) {
				return ok
			}
		} catch(error) {
			this.onError(this.label, '_become', error)
		}
	}
	
	async _isInternetWorks() {
		return new Promise(async success => {
			let tooLong = setTimeout(() => {
				this._isInternetWorks.reason = 'tooLong'
				success(false)
			}, Settings.redisTimeout)
			try {
				if (this.redis) {
					let internetWorksDate = await this.redis.hget(ArbiterTime.name, 'internetWorks')
					let timeSinceLastCheck = Date.now() - internetWorksDate
					if (timeSinceLastCheck < Settings.arbiterTimeInterval * 2) {
						clearTimeout(tooLong)
						this._isInternetWorks.reason = timeSinceLastCheck
						success(true)
					} else {
						this._isInternetWorks.reason = 'arbiterTimeInterval'
						success(false)
					}
				} else {
					this._isInternetWorks.reason = '!this.redis'
					success(false)
				}
			} catch (err) {
				this._isInternetWorks.reason = 'catch'
				success(false)
			}
		}).catch(error => {
			this.onError(this.label, '_isInternetWorks', error)
		})
	}
	
	async _isAnotherServerConnected() {
		return new Promise(success => {
			this._sendToAnotherServer({ check: this.anotherIp }, !this._isAnotherServerConnectedLastTime)
			this._isAnotherServerConnectedSuccess = success
			if (this._isAnotherServerConnectedST) {
				clearTimeout(this._isAnotherServerConnectedST) 
			}
			this._isAnotherServerConnectedST = setTimeout(() => {
				this._isAnotherServerConnectedSuccess(false)
				this.log({ label: this.label, data: 'Another server is not connected' })
			}, Settings.arbiterCheckTimeout)
		}).then(isConnected => {
			this._isAnotherServerConnectedLastTime = isConnected
			return isConnected
		}).catch(error => {
			this.onError(this.label, '_isAnotherServerConnected', error)
		})
	}
	
	async _wasMasterLastTime() {
		try {
			this._wasMasterLastTimeLog = []
			let masterIpByCurrent = await this.redis.hget(this.label, 'masterIp')
			this._wasMasterLastTimeLog.push('masterIpByCurrent:' + masterIpByCurrent)
			let masterIpByAnother = false
			// if (this.anotherRedis) {
				// masterIpByAnother = await this.anotherRedis.hget(this.label, 'masterIp')
				// this._wasMasterLastTimeLog.push('masterIpByAnother: ' + masterIpByAnother)
			// }
			let masterIp = masterIpByCurrent || masterIpByAnother
			this._wasMasterLastTimeLog.push('masterIp: ' + masterIp)
			// if (masterIpByCurrent && masterIpByAnother && masterIpByCurrent !== masterIpByAnother) {
				// let masterDateByCurrent = await this.redis.hget(this.label, 'masterDate')
				// this._wasMasterLastTimeLog.push('masterDateByCurrent: ' + masterDateByCurrent)
				// let masterDateByAnother = 0
				// if (this.anotherRedis) {
					// masterDateByAnother = await this.anotherRedis.hget(this.label, 'masterDate')
					// this._wasMasterLastTimeLog.push('masterDateByAnother: ' + masterDateByAnother)
				// }
				// let isCurrentMasterFresher = (masterDateByCurrent>>>0 > masterDateByAnother>>>0)
				// this._wasMasterLastTimeLog.push('isCurrentMasterFresher: ' + isCurrentMasterFresher)
				// masterIp = (isCurrentMasterFresher ? masterIpByCurrent : masterIpByAnother)
				// this._wasMasterLastTimeLog.push('masterIpAfter: ' + masterIp)
			// }
			if (!masterIp) {
				masterIp = this.predispositionalMasterIp
			}
			return (masterIp === this.currentIp)
		} catch(error) {
			this.onError(this.label, '_wasMasterLastTime', error)
		}
	}
	
	async _wasInternetBreach() {
		try {
			let internetBreach = await this.redis.hget(ArbiterTime.name, 'internetBreach')
			if (!internetBreach) {
				internetBreach = 0
			}
			if (internetBreach && (Date.now() - internetBreach) > Settings.arbiterTimeInterval * 3) {
				internetBreach = false
			}
			return !!internetBreach
		} catch(error) {
			this.onError(this.label, '_wasInternetBreach', error)
		}
	}
	
	get _isPredispositionalMaster() {
		return (this.currentIp === this.predispositionalMasterIp)
	}
	
	async _getMasterInfo() {
		try {
			let masterIp = await this.redis.hget(this.label, 'masterIp')
			let slaveIp = await this.redis.hget(this.label, 'slaveIp')
			let masterDate = await this.redis.hget(this.label, 'masterDate')
		} catch(error) {
			this.onError(this.label, '_getMasterInfo', error)
		}
	}
	
	async _setMasterInfo(object) {
		try {
			await this.redis.hset(this.label, 'masterIp', object.masterIp)
			await this.redis.hset(this.label, 'slaveIp', object.slaveIp)
			await this.redis.hset(this.label, 'masterDate', object.masterDate)
			console.log('_setMasterInfo masterIp', object.masterIp)
			if (!object.exec) {
				object.exec = this._setMasterInfo.name
				this._sendToAnotherServer(object)
			}
		} catch(error) {
			this.onError(this.label, '_setMasterInfo', error)
		}
	}
	
	_setChoosingInterval() {
		setInterval(() => {
			this._choosing()
		}, Settings.arbiterChoosingInterval)
	}
}

module.exports = Arbiter