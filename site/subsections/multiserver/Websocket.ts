const crypto = require('crypto')
const FileHandler = require('../stagePath/_common/FileHandler')
const Redis = require('../stagePath/_common/Redis')
const Settings = require('../stagePath/_common/Settings')
const { Server, Socket } = require('socket.io')
const WebsocketOnServer = require('./common/WebsocketOnServer')

const sdaLabelPath = '/usr/nodejs/sda/' + process.env.STAGE + '/' + Settings.label + '/'
const siteSettings = require(sdaLabelPath + 'Logins.js')

type onError = (className: string, method: string, error: unknown) => void

class Websocket extends WebsocketOnServer {
	onError: onError
	label: string
	server!: Server
	
	constructor(onError: onError, rabbitMQ, socketLabel: string) {
		super(onError, socketLabel.toLowerCase())
		this.rabbitMQ = rabbitMQ
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
	}
	
	async onData(socket, data) {
		try {
			if (data.type === 'getDomainShortLog') {
				this._onGetDomainShortLog(socket, data.domain)
			} else if (data.type === 'copyToAnotherServer') {
				this._copyToAnotherServer(socket, data.domain)
			} else if (data.type === 'pass') {
				let sha1 = crypto.createHash('sha1').update(data.value).digest('hex')
				this._checkForAdmin(socket, sha1 === siteSettings.dataAdminPasswordSha1)
			} else if (data.type === 'logout') {
				let uid = this.getUid(socket)
				delete this.admins[uid]
				await this.adminsFileHandler.objectToFile(this.admins)
				socket.emit(this.socketLabel, { type: data.type })
			} else if (data.type === 'restartContainer') {
				let uid = this.getUid(socket)
				this._restartContainer(data.value, uid)
			} else {
				console.log(data)
			}
		} catch (error) {
			this.onError(this.label, 'onData', error)
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
		this.rabbitMQ.send({ label: 'Dockerrun', type: 'start', hostname, uid })
	}
}

module.exports = Websocket