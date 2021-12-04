import * as t from './types'
import * as tc from '../../../_common/types'
const cryptoFunction = require('crypto')
const DataHandler = require('./DataHandler')
const FileHandler: tc.FileHandler = require('../stagePath/_common/FileHandler')
const Settings: tc.settings = require('../stagePath/_common/Settings')
const WebsocketOnServer = require('./common/WebsocketOnServer')

const sdaLabelPath = '/usr/nodejs/sda/' + (process.env.STAGE as string) + '/' + Settings.label + '/'
const siteLogins = require(sdaLabelPath + 'Logins.js')
const siteSettings = require(sdaLabelPath + 'Settings.js')

class Websocket extends WebsocketOnServer {
	private readonly label: string
	private readonly syncerLabel: string
	private clickless: boolean
	private readonly adminsPath: string
	private dataHandler?: typeof DataHandler
	
	constructor(object: t.share) {
		super(object.onError, object.label.toLowerCase())
		this.log = object.log
		this.rabbitMQ = object.rabbitMQ
		this.commonLabel = object.label
		this.domain = object.domain
		this.currentIp = object.currentIp
		
		this.label = this.constructor.name
		this.syncerLabel = 'Syncer'
		this.clickless = false
		this.adminsPath = sdaLabelPath + 'subsections/multiserver/stageSensitive/admins.json'
	}
	
	public async start(): Promise<void> {
		try {
			this.adminsFileHandler = new FileHandler(this.onError, this.adminsPath)
			await this.adminsFileHandler.ifNotExistsCreateEmpty()
			this.admins = await this.adminsFileHandler.objectFromFile()
			this.setSocket()
			await this.rabbitMQ.receive({ label: this.commonLabel, callback: this._onMultiServer.bind(this) })
			await this.rabbitMQ.receive({ label: this.syncerLabel, callback: this._onSyncer.bind(this) })
		} catch (error: unknown) {
			this.onError(this.label, 'start', error)
		}
	}
	
	public setDataHandler(dataHandler: typeof DataHandler): void {
		this.dataHandler = dataHandler
	}
	
	public onConnection(socket: tc.socket): void {
		this._checkForAdmin(socket, false)
		if (this.dataHandler) {
			let dataHandlerDynamic = this.dataHandler.dataHandlerDynamic
			if (dataHandlerDynamic) {
				let uptimeDates = dataHandlerDynamic.uptimeDates
				let roles = dataHandlerDynamic.roles
				socket.emit(this.socketLabel, { uptimeDates, roles })
			}
		}
	}
	
	public async onData(socket: tc.socket, data: t.data<string>): Promise<void> {
		try {
			if (data.type === 'getDomainShortLog') {
				this._onGetDomainShortLog(socket, data.domain)
			} else if (data.type === 'copyToAnotherServer') {
				this._copyToAnotherServer(socket, data.domain)
			} else if (data.type === 'pass') {
				let sha1 = cryptoFunction.createHash('sha1').update(data.value).digest('hex')
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
			}
		} catch (error: unknown) {
			this.onError(this.label, 'onData', error)
		}
	}
	
	private _onMultiServer(object: t.data<string>): void {
		if (object.type === 'restartContainer') {
			if (object.domain === this.domain) {
				this._restartContainer(object.value, object.uid)
			}
		}
	}
	
	private _onSyncer(object: t.data<t.data<string>>): void {
		if (object.allToSlaveDone) {
			try {
				this.server.to(object.allToSlaveDone.socketId).emit(this.socketLabel, {
					type: 'copyToAnotherServerHasDone',
					domain: object.allToSlaveDone.domain
				})
			} catch (error: unknown) {
				this.onError(this.label, '_onSyncer allToSlaveDone', error)
			}
			this.clickless = false
		}
	}
	
	private _onGetDomainShortLog(socket: tc.socket, domain: string): void {
		let domainShortLogData = this.dataHandler.getDomainShortLogData(domain)
		socket.emit(this.socketLabel, {
			domainShortLogData,
			domain,
		})
	}
	
	private _copyToAnotherServer(socket: tc.socket, domain: string): void {
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
					uid,
				}
			})
		}
	}
	
	private _checkForAdmin(socket: tc.socket, force: boolean): void {
		let uid = this.getUid(socket)
		if (this.admins[uid] || force) {
			this.admins[uid] = Date.now()
			this.adminsFileHandler.objectToFileLater(this.admins)
			socket.emit(this.socketLabel, { type: 'passIsCorrect' })
		} else {
			socket.emit(this.socketLabel, { type: 'passIsIncorrect' })
		}
	}
	
	private _restartContainer(hostname: string, uid: string): void {
		this.rabbitMQ.send({
			label: 'Dockerrun',
			type: 'start',
			hostname,
			uid,
		})
	}
}

module.exports = Websocket