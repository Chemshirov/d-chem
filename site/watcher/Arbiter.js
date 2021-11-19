const ArbiterTime = require('./ArbiterTime.js')
const Settings = require('../../_common/Settings.js')
const Syncer = require('./Syncer.js')

class Arbiter {
	constructor(setupObject) {
		this.onError = setupObject.onError
		this.log = setupObject.log
		this.rabbitMQ = setupObject.rabbitMQ
		this.redis = setupObject.redis
		this.currentIp = setupObject.currentIp
		this.anotherIp = setupObject.anotherIp
		this.predispositionalMasterIp = setupObject.predispositionalMasterIp
		this.setupObject = setupObject
		this.label = this.constructor.name
	}
	
	async init() {
		try {
			this._sendToAnotherServer({ exec: '_connectToAnotherServer' })
			this.arbiterTime = new ArbiterTime(this.onError, this.redis)
			await this.arbiterTime.init()
			await this.rabbitMQ.receive({
				label: this.label,
				callback: this._onArbiter.bind(this)
			})
			await this._connectToAnotherServer(true)
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
			if (object.exec) {
				if (typeof this[object.exec] === 'function') {
					this[object.exec](object)
				}
			}
		} catch(error) {
			this.onError(this.label, '_onArbiter', error)
		}
	}
	
	async _onAnotherServerArbiter(object) {
		try {
			if (object.check) {
				if (object.check === this.currentIp) {
					if (this._isAnotherServerConnectedSuccess) {
						if (!this._isAnotherServerConnectedStatus) {
							this._isAnotherServerConnectedStatus = true
							this.log({ label: this.label, data: 'Another server has become available' })
						}
						this._isAnotherServerConnectedSuccess(true)
						if (this._isAnotherServerConnectedST) {
							clearTimeout(this._isAnotherServerConnectedST)
						}
					}
				}
			}
		} catch(error) {
			this.onError(this.label, '_onAnotherServerArbiter', error)
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
	
	async _connectToAnotherServer(atStart) {
		try {
			await this.rabbitMQ.receive({
				getNewConnection: true,
				rabbitHostName: this.anotherIp,
				label: this.label,
				callback: this._onAnotherServerArbiter.bind(this)
			})
			if (!atStart || atStart.exec) {
				this.rabbitMQ.send({
					getNewConnection: true,
					rabbitHostName: this.anotherIp,
					label: this.label,
					message: {}
				})
				this.rabbitMQ.send({
					getNewConnection: true,
					rabbitHostName: this.anotherIp,
					label: 'Syncer',
					message: {}
				})
			}
		} catch(error) {
			this.onError(this.label, '_connectToAnotherServer', error)
		}
	}
	
	async _choosing() {
		try {
			if (this._isInternetWorks()) {
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
				let message = 'Internet does not work, reason: ' + this._isInternetWorks.reason
				this.log({ label: this.label, data: message })
				await this._becomeSlave(message)
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
			let internetBreachDuration = await this._wasInternetBreach()
			if (internetBreachDuration) {
				await this.redis.hdel(ArbiterTime.name, 'internetBreach')
				this.log({ label: this.label, internetBreachDuration })
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
	
	_isInternetWorks() {
		let timeSinceLastCheck = Date.now() - (this.arbiterTime.internetWorksDate || 0)
		if (timeSinceLastCheck < Settings.arbiterTimeInterval * 2) {
			this._isInternetWorks.reason = timeSinceLastCheck
			return true
		} else {
			this._isInternetWorks.reason = 'waiting is too long, timeSinceLastCheck: ' + timeSinceLastCheck
			return false
		}
	}
	
	async _isAnotherServerConnected() {
		return new Promise(success => {
			this._sendToAnotherServer({ check: this.currentIp }, !this._isAnotherServerConnectedLastTime)
			this._isAnotherServerConnectedSuccess = success
			if (this._isAnotherServerConnectedST) {
				clearTimeout(this._isAnotherServerConnectedST) 
			}
			this._isAnotherServerConnectedST = setTimeout(() => {
				this._isAnotherServerConnectedStatus = false
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
			let wasInternetBreach = false
			let label = ArbiterTime.name
			let now = Date.now()
			let internetBreachDate = await this.redis.hget(label, 'internetBreach')
			if (internetBreachDate) {
				let lastTimeInternetWorked = await this.redis.hget(label, 'lastTimeInternetWorked')
				let internetBreachDuration = (now - lastTimeInternetWorked)
				wasInternetBreach = internetBreachDuration
				let tooOld = ((now - internetBreachDate) > Settings.arbiterTimeInterval * 3)
				if (tooOld) {
					wasInternetBreach = false
				}
			}
			return !!wasInternetBreach
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