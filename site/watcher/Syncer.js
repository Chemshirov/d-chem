const sda = '/usr/nodejs/sda/'
const sdaLabelPath = sda + process.env.STAGE + '/' + process.env.LABEL + '/'

const child_process = require('child_process')
const logins = require(sdaLabelPath + 'Logins.js')
const Redis = require('../../_common/Redis.js')
const siteSettings = require(sdaLabelPath + 'Settings.js')

class Syncer {
	constructor(onError, rabbitMQ) {
		this.onError = onError
		this.rabbitMQ = rabbitMQ
		this.label = this.constructor.name
		this.financeLabel = 'finance6'
		this.financeContainerName = process.env.PREFIX + process.env.LABEL + '_' + this.financeLabel
	}
	
	async init() {
		this.rabbitMQ.subscribe(this._reconnectToRedis.bind(this), 'reconnectToRedis')
		this.rabbitMQ.subscribe(this._remoteSync.bind(this), 'remote' + this.label)
		this.rabbitMQ.subscribe(this._finance6.bind(this), this.financeLabel)
		await this._init()
	}
	
	async copyToSlave() {
		await this._copyFilesAndBasesFromMasterToSlave()
	}
	
	async request(path) {
		await this._request({ path })
	}
	
	async _request(object, label, slaveToMaster) {
		try {
			this.masterIp = await this.currentRedis.hget('Arbiter', 'masterIp').catch(this.currentRedis.onCatch)
			let currentIsMaster = (this.currentIp === this.masterIp)
			let direction = currentIsMaster
			if (slaveToMaster) {
				direction = !currentIsMaster
			}
			if (direction) {
				if (!label) {
					label = this.label
				}
				await this._setRedis('anotherRedis', 'anotherIp', true)
				if (this.anotherRedis) {
					await this.anotherRedis.publish(label, JSON.stringify(object))
					await this.rabbitMQ.send('logger', {type: 'log', label, object})
				}
			}
		} catch(error) {
			this.onError(this.label, '_request', error)
		}
	}
	
	async _catchRequest() {
		try {
			this.subscribedRedis.on('message', async (channel, message) => {
				try {
					let object = JSON.parse(message)
					if (channel === this.label) {
						await this._rsync(object.path)
					} else
					if (channel === this.financeLabel) {
						await this._finance6(object, 'catched')
					}
				} catch(error) {
					this.onError(this.label, '_catchRequest onMessage', error)
				}
			})
		} catch(error) {
			this.onError(this.label, '_catchRequest', error)
		}
	}
	
	async _rsync(path) {
		try {
			return new Promise(success => {
				let user = logins.sshUser
				let host = this.anotherIp
				path = path.replace(/\/$/, '')
				let serverPath = siteSettings.dockerPathToServerPath(path)
				let cmd = `rsync -a --rsh=ssh ${user}@${host}:${serverPath}/ ${path} --delete;`
				child_process.exec(cmd, (error, stdout, stderr) => {
					if (error) {
						this.onError(this.label, 'work child_process', error)
					} else {
						this.rabbitMQ.send('logger', {type: 'log', label: process.env.HOSTNAME, data: cmd})
					}
					success()
				})
			}).catch(error => {
				this.onError(this.label, '_rsync Promise', error)
			})
		} catch(error) {
			this.onError(this.label, '_rsync', error)
		}
	}
	
	_copyFilesAndBasesFromMasterToSlave() {
		return new Promise(async success => {
			try {
				this.rabbitMQ.send('logger', {type: 'log', label: process.env.HOSTNAME, data: 'copyingToSlave'})
				await this._getIp()
				await this._rsync(process.env.TILDA + process.env.STAGE + '/')
				await this._rsync(sdaLabelPath)
				await this._rsync(process.env.TILDA + 'libraries/')
				let ok = await this.rabbitMQ.send(this.financeContainerName, {type: 'syncSql'})
				this.rabbitMQ.send('logger', {type: 'log', label: process.env.HOSTNAME, data: 'copyedToSlave'})
				if (ok) {
					success()
				}
			} catch(error) {
				this.onError(this.label, '_slaveCopyAtStart catch', error)
			}
		}).catch(error => {
			this.onError(this.label, '_slaveCopyAtStart Promise', error)
		})
	}
	
	async _init() {
		try {
			await this._getIp()
			await this._setRedis('currentRedis', 'currentIp')
			await this._setRedis('anotherRedis', 'anotherIp', true)
			await this._subscribeInit()
		} catch(error) {
			this.onError(this.label, '_init', error)
		}
	}
	
	async _getIp() {
		try {
			this.currentIp = await siteSettings.getCurrentIp()
			this.anotherIp = siteSettings.getAnotherIp(this.currentIp)
		} catch(error) {
			this.onError(this.label, '_getIp', error)
		}
	}
	
	async _setRedis(redisName, ipName, isSecondary) {
		try {
			if (this[redisName]) {
				this[redisName].disconnect()
			}
			let redis = new Redis(this.onError)
			this[redisName] = await redis.connect(this[ipName], isSecondary)
		} catch(error) {
			this.onError(this.label, '_setRedis', error)
		}
	}
	
	async _subscribeInit() {
		try {
			await this._setRedis('subscribedRedis', 'currentIp')
			await this.subscribedRedis.subscribe(this.label)
			await this.subscribedRedis.subscribe(this.financeLabel)
			this._catchRequest()
		} catch(error) {
			this.onError(this.label, '_subscribeInit', error)
		}
	}
	
	async _reconnectToRedis() {
		try {
			if (this.subscribedRedis) {
				await this._subscribeInit()
			}
		} catch(error) {
			this.onError(this.label, '_reconnectToRedis', error)
		}
	}
	
	async _finance6(object, side) {
		try {
			if (!side) {
				this._request(object, this.financeLabel, true)
			} else if (side === 'catched') {
				await this.rabbitMQ.send(this.financeContainerName, object)
			}
		} catch(error) {
			this.onError(this.label, '_finance6', error)
		}
	}
	
	async _remoteSync(object) {
		try {
			this._request(object, this.label, object.slaveToMaster)
		} catch(error) {
			this.onError(this.label, '_get', error)
		}
	}
}

module.exports = Syncer