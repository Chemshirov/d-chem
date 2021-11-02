const tildaPath = (process.env.TILDA ?? '.') as string
const afterTildaPath = (process.env.AFTER_TILDA ?? '') as string
const currentPath = (tildaPath + afterTildaPath) as string
const stageString = (process.env.STAGE ?? '') as string
const stagePath = (tildaPath + stageString + '/') as string

const NextHandler = require(stagePath + '_common/NextHandler')
const Starter = require(stagePath + '_common/Starter')
const TsHandler = require(stagePath + '_common/TsHandler')

class Multiserver extends Starter {
	constructor() {
		super()
		this.label = this.constructor.name
	}
	
	async atStart() {
		try {
			await this._handleTsFiles()
			await this.getDomainAndIps()
			let websocket = this._startWebsocket()
			let dataHandler = await this._startDataHandler()
			dataHandler.setDynamic(websocket.sockets, this.label)
			websocket.setDataHandler(dataHandler)
			await this._startNextFramework()
		} catch (error) {
			this.onError(this.label, 'atStart', error)
		}
	}
	
	async _handleTsFiles() {
		try {
			let tsHandler = new TsHandler(this.onError.bind(this), this.log)
			tsHandler.tsDirectory = currentPath
			tsHandler.jsDirectory = '/usr/nodejs/assets'
			tsHandler.excludeDirectories = ['/next', './node_modules']
			tsHandler.excludeFiles = ['next-env.d.ts']
			await tsHandler.convertOnce()
			await tsHandler.watch()
			let tsCommonHandler = new TsHandler(this.onError.bind(this), this.log)
			tsCommonHandler.tsDirectory = stagePath + '_common/'
			tsCommonHandler.jsDirectory = '/usr/nodejs/assets/common'
			tsCommonHandler.excludeDirectories = ['/next'] //? doesn't work without the line.
			await tsCommonHandler.convertOnce()
			await tsCommonHandler.watch()
		} catch (error) {
			this.onError(this.label, '_handleTsFiles', error)
		}
	}
	
	_startWebsocket() {
		const Websocket = require('./assets/Websocket')
		let object = {
			onError: this.onError.bind(this),
			rabbitMQ: this.rabbitMQ,
			label: this.label,
			domain: this.domain,
			currentIp: this.currentIp,
			anotherIp: this.anotherIp,
		}
		let websocket = new Websocket(object)
		websocket.start()
		return websocket
	}
	
	async _startDataHandler() {
		try {
			const DataHandler = require('./assets/DataHandler')
			let dataHandler = new DataHandler(this.onError.bind(this), this.redis)
			await dataHandler.setStatic()
			return dataHandler
		} catch (error) {
			this.onError(this.label, '_startDataHandler', error)
		}
	}
	
	async _startNextFramework() {
		try {
			let nextPath = currentPath + 'next/'
			let nextHandler = new NextHandler(this.onError.bind(this), this.log, nextPath)
			await nextHandler.start(this.domain)
		} catch (error) {
			this.onError(this.label, '_startNextFramework', error)
		}
	}
}

new Multiserver().start()
module.exports = Multiserver