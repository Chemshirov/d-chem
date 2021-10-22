const sda = '/usr/nodejs/sda/'
const sdaLabelPath = sda + process.env.STAGE + '/' + process.env.LABEL + '/'

const logins = require(sdaLabelPath + 'Logins.js')
const siteSettings = require(sdaLabelPath + 'Settings.js')

class Syncer {
	constructor(setupObject) {
		this.onError = setupObject.onError
		this.log = setupObject.log
		this.rabbitMQ = setupObject.rabbitMQ
		this.currentIp = setupObject.currentIp
		this.anotherIp = setupObject.anotherIp
		this.isMaster = setupObject.isMaster
		this.label = this.constructor.name
		this._awaiterPool = {}
	}
	
	async init() {
		try {
			await this.rabbitMQ.receive({ label: this.label, callback: this._onSyncer.bind(this) })
			await this.rabbitMQ.receive({ label: 'Worker', callback: this._onWorker.bind(this) })
			await this.rabbitMQ.receive({ label: 'Finance6', callback: this._onFinance6.bind(this) })
		} catch(error) {
			this.onError(this.label, 'init', error)
		}
	}
	
	async _onSyncer(object) {
		try {
			if (object.pathToRsync) {
				this.log('request to rsync has been catched, path: ' + object.pathToRsync)
				await this._rsync(object.pathToRsync)
			} else if (object.syncToSlave) {
				this.request(object.syncToSlave)
				if (object.resender !== this.anotherIp) {
					object.resender = this.currentIp
					this.rabbitMQ.send({
						rabbitHostName: this.anotherIp,
						label: this.label,
						message: object
					})
				}
			} else if (object.allToSlave) {
				this._request({ allToSlave: object.allToSlave })
				let currentIsMaster = await this.isMaster()
				if (!currentIsMaster) {
					await this._copyFilesAndBasesFromMasterToHere()
					this._request({ allToSlaveDone: object.allToSlave }, true)
				} else {
					this.log('Copy to slave has been initialized by uid: ' + object.allToSlave.uid)
				}
			}
		} catch(error) {
			this.onError(this.label, '_onSyncer', error)
		}
	}
	
	_onWorker(object) {
		if (object.hasOwnProperty('result') && object.request === 'execByCmd' && object.uniqueId) {
			this._awaiter(object.uniqueId)
		}
	}
	
	_onFinance6(object) {
		if (object.type === 'sqlSynced') {
			this._awaiter(object.uniqueId)
		}
	}
	
	async copyToSlave() {
		await this._copyFilesAndBasesFromMasterToHere()
	}
	
	request(path) {
		this._request({ pathToRsync: path })
	}
	
	async _request(object, slaveToMaster) {
		try {
			let currentIsMaster = await this.isMaster()
			let direction = currentIsMaster
			if (slaveToMaster) {
				direction = !currentIsMaster
			}
			if (direction) {
				this.rabbitMQ.send({
					rabbitHostName: this.anotherIp,
					label: this.label,
					message: object
				})
			}
		} catch(error) {
			this.onError(this.label, '_request', error)
		}
	}
	
	async _rsync(path, uniqueId) {
		try {
			let user = logins.sshUser
			let host = this.anotherIp
			path = path.replace(/\/$/, '')
			let serverPath = siteSettings.dockerPathToServerPath(path)
			let cmd = `rsync -a --protect-args --rsh=ssh ${user}@${host}:"${serverPath}/" "${path}"`
				cmd += ` --exclude ".next"`
				cmd += ` --exclude "stageSensitive"`
				cmd += ` --delete;`
			let message = { request: 'execByCmd', cmd, uniqueId }
			this.rabbitMQ.send({ label: 'Worker', message })
		} catch(error) {
			this.onError(this.label, '_rsync catch', error)
		}
	}
	
	_copyFilesAndBasesFromMasterToHere() {
		return new Promise(async success => {
			try {
				this.log(this.label, 'copying has started')
				await this._awaiterRsync(process.env.TILDA + process.env.STAGE + '/')
				await this._awaiterRsync(process.env.TILDA + 'libraries/')
				await this._awaiterRsync(sdaLabelPath)
				await this._awaiterRsync(sda + 'audiobooks/')
				await this._awaiterRsync(sda + 'films/')
				await this._awaiterRsync(sda + 'music/')
				await this._awaiterSqlSync()
				this.log(this.label, 'all data has been copyed to slave (' + this.currentIp + ')')
				success()
			} catch(error) {
				this.onError(this.label, '_slaveCopyAtStart catch', error)
			}
		}).catch(error => {
			this.onError(this.label, '_slaveCopyAtStart Promise', error)
		})
	}
	
	_awaiterRsync(path) {
		return new Promise(success => {
			let uniqueId = this._setAwaiter(success)
			this._rsync(path, uniqueId)
		}).catch(error => {
			this.onError(this.label, '_awaiterRsync', error)
		})
	}
	
	_awaiterSqlSync() {
		return new Promise(success => {
			let uniqueId = this._setAwaiter(success)
			this.rabbitMQ.send({ 
				label: 'Finance6',
				message: {
					type: 'syncSql',
					uniqueId
				}
			})
		}).catch(error => {
			this.onError(this.label, '_awaiterSqlSync', error)
		})
	}
	
	_setAwaiter(success) {
		let uniqueId = Date.now() + '_' + Math.random()
		this._awaiterPool[uniqueId] = success
		return uniqueId
	}
	
	_awaiter(uniqueId) {
		if (uniqueId) {
			let success = this._awaiterPool[uniqueId]
			if (success) {
				success()
			}
		}
	}
}

module.exports = Syncer