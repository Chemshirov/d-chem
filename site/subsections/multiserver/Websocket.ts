const crypto = require('crypto')
const FileHandler = require('../stagePath/_common/FileHandler')
const Settings = require('../stagePath/_common/Settings')
const { Server, Socket } = require('socket.io')
const WebsocketOnServer = require('./common/WebsocketOnServer')

const sdaLabelPath = '/usr/nodejs/sda/' + process.env.STAGE + '/' + Settings.label + '/'
const siteLogins = require(sdaLabelPath + 'Logins.js')
const siteSettings = require(sdaLabelPath + 'Settings.js')


type onError = (className: string, method: string, error: unknown) => void

class Websocket extends WebsocketOnServer {
	onError: onError
	label: string
	server!: Server
	
	constructor(object) {
		super(object.onError, object.label.toLowerCase())
		this.log = object.log
		this.rabbitMQ = object.rabbitMQ
		this.commonLabel = object.label
		this.domain = object.domain
		this.currentIp = object.currentIp
		this.anotherIp = object.anotherIp
		this.label = this.constructor.name
		this.syncerLabel = 'Syncer'
		this.clickless = false
		this.adminsPath = sdaLabelPath + 'subsections/multiserver/stageSensitive/admins.json'
	}
	
	async start() {
		try {
			this.adminsFileHandler = new FileHandler(this.onError, this.adminsPath)
			await this.adminsFileHandler.ifNotExistsCreateEmpty()
			this.admins = await this.adminsFileHandler.objectFromFile()
			this.setSocket()
			await this.rabbitMQ.receive({ label: this.commonLabel, callback: this._onMultiServer.bind(this) })
			await this.rabbitMQ.receive({ label: this.syncerLabel, callback: this._onSyncer.bind(this) })
		} catch (error) {
			this.onError(this.label, 'start', error)
		}
	}
	
	setDataHandler(dataHandler) {
		this.dataHandler = dataHandler
	}
	
	onConnection(socket) {
		this._checkForAdmin(socket)
		if (this.dataHandler) {
			let dataHandlerDynamic = this.dataHandler.dataHandlerDynamic
			if (dataHandlerDynamic) {
				let uptimeDates = dataHandlerDynamic.uptimeDates
				let roles = dataHandlerDynamic.roles
				socket.emit(this.socketLabel, { uptimeDates, roles })
			}
		}
	}
	
	async onData(socket, data) {
		try {
			if (data.type === 'getDomainShortLog') {
				this._onGetDomainShortLog(socket, data.domain)
			} else if (data.type === 'copyToAnotherServer') {
				this._copyToAnotherServer(socket, data.domain)
			} else if (data.type === 'pass') {
				let sha1 = crypto.createHash('sha1').update(data.value).digest('hex')
				this._checkForAdmin(socket, sha1 === siteLogins.dataAdminPasswordSha1)
			} else if (data.type === 'logout') {
				let uid = this.getUid(socket)
				delete this.admins[uid]
				await this.adminsFileHandler.objectToFile(this.admins)
				socket.emit(this.socketLabel, { type: data.type })
			} else if (data.type === 'askForPermission') {
				let uid = this.getUid(socket)
				this.log('Ask for permission from ' + uid)
			} else if (data.type === 'restartContainer') {
				let uid = this.getUid(socket)
				if (this.domain === data.domain) {
					this._restartContainer(data.value, uid)
				} else {
					data.uid = uid
					let ip = this.currentIp
					
					let stage = Settings.productionStageName
					if (Settings.developmentDomains.includes(data.domain)) {
						stage = Settings.developmentStageName
					}
					Object.keys(siteSettings.stageIpDomain[stage]).forEach(ipString => {
						let domain = siteSettings.stageIpDomain[stage][ipString]
						if (domain === data.domain) {
							ip = ipString
						}
					})
					let port = Settings.rabbitPortByStage(stage)
					this.rabbitMQ.send({
						rabbitHostName: ip,
						port,
						label: this.commonLabel,
						message: data
					})
				}
			} else {
				console.log(data)
			}
		} catch (error) {
			this.onError(this.label, 'onData', error)
		}
	}
	
	_onMultiServer(object) {
		if (object.type === 'restartContainer') {
			if (object.domain === this.domain) {
				this._restartContainer(object.value, object.uid)
			}
		}
	}
	
	_onSyncer(object) {
		if (object.allToSlaveDone) {
			try {
				this.server.to(object.allToSlaveDone.socketId).emit(this.socketLabel, {
					type: 'copyToAnotherServerHasDone',
					domain: object.allToSlaveDone.domain
				})
			} catch (error) {
				this.onError(this.label, '_onSyncer allToSlaveDone', error)
			}
			this.clickless = false
		}
	}
	
	_onGetDomainShortLog(socket: Socket, domain: string) {
		let domainShortLogData = this.dataHandler.getDomainShortLogData(domain)
		socket.emit(this.socketLabel, {
			domainShortLogData,
			domain
		})
	}
	
	_copyToAnotherServer(socket: Socket, domain: string) {
		if (!this.clickless) {
			this.clickless = true
			let type = 'copyToAnotherServerHasReceived'
			socket.emit(this.socketLabel, {
				type,
				domain
			})
			let uid = this.getUid(socket)
			this.rabbitMQ.send({
				label: this.syncerLabel,
				allToSlave: {
					domain,
					socketId: socket.id,
					uid 
				}
			})
		}
	}
	
	_checkForAdmin(socket, force) {
		let uid = this.getUid(socket)
		if (this.admins[uid] || force) {
			this.admins[uid] = Date.now()
			this.adminsFileHandler.objectToFileLater(this.admins)
			socket.emit(this.socketLabel, { type: 'passIsCorrect' })
		} else {
			socket.emit(this.socketLabel, { type: 'passIsIncorrect' })
		}
	}
	
	_restartContainer(hostname, uid) {
		this.rabbitMQ.send({
			label: 'Dockerrun',
			type: 'start',
			hostname,
			uid
		})
	}
}

module.exports = Websocket