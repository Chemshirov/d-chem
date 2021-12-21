import * as t from './types'
import * as tc from '../../../_common/types'
const cryptoFunction = require('crypto')
const FileHandler: tc.FileHandler = require('../stagePath/_common/FileHandler')
const Settings: tc.settings = require('../stagePath/_common/Settings')
const WebsocketOnServer = require('./common/WebsocketOnServer')

const sdaLabelPath = '/usr/nodejs/sda/' + (process.env.STAGE as string) + '/' + Settings.label + '/'
const siteLogins = require(sdaLabelPath + 'Logins.js')
const siteSettings = require(sdaLabelPath + 'Settings.js')

export default class Websocket extends WebsocketOnServer {
	private readonly label: string
	private clickless: boolean
	private readonly adminsPath: string
	
	constructor(object: t.share) {
		super(object.onError, object.label.toLowerCase())
		this.log = object.log
		this.rabbitMQ = object.rabbitMQ
		this.commonLabel = object.label
		this.domain = object.domain
		this.currentIp = object.currentIp
		
		this.label = this.constructor.name
		this.clickless = false
		this.adminsPath = Settings.subsectionsPath + this.commonLabel.toLowerCase() + '/stageSensitive/admins.json'
	}
	
	public async start(): Promise<void> {
		try {
			this.adminsFileHandler = new FileHandler(this.onError, this.adminsPath)
			await this.adminsFileHandler.ifNotExistsCreateEmpty()
			this.admins = await this.adminsFileHandler.objectFromFile()
			
			this.setSocket()
			// await this.rabbitMQ.receive({ label: this.commonLabel, callback: this._onIndex.bind(this) })
		} catch (error: unknown) {
			this.onError(this.label, 'start', error)
		}
	}
	
	public onConnection(socket: tc.socket): void {
		this._checkForAdmin(socket, false)
		
	}
	
	public async onData(socket: tc.socket, data: tc.keyValue<string>): Promise<void> {
		try {
			this.log(data)
		} catch (error: unknown) {
			this.onError(this.label, 'onData', error)
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
}