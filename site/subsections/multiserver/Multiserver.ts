import * as t from './types'
import * as tc from '../../../_common/types'
const DataHandler = require('./DataHandler')
const NextHandler: tc.NextHandler = require('../stagePath/_common/NextHandler')
const Starter: tc.Starter = require('../stagePath/_common/Starter')
const Websocket = require('./Websocket')

class Multiserver extends Starter {
	private currentPath: string
	private tsHandlers: Array<tc.TsHandler>
	private readonly label: string
	
	constructor(currentPath: string, tsHandlers: Array<tc.TsHandler>) {
		super()
		this.currentPath = currentPath
		this.tsHandlers = tsHandlers
		this.label = this.constructor.name
	}
	
	private async atStart(): Promise<void> {
		try {
			await this.getDomainAndIps()
			await this._setTsWatch()
			await this._start()
		} catch (error: unknown) {
			this.onError(this.label, 'atStart', error)
		}
	}
	
	private async _setTsWatch(): Promise<void> {
		try {
			let isMaster = await this.isMaster()
			if (isMaster) {
				for (let i = 0; i < this.tsHandlers.length; i++) {
					let tsHandler = this.tsHandlers[i]
					await tsHandler.watch()
				}
			}
		} catch (error: unknown) {
			this.onError(this.label, '_setTsWatch', error)
		}
	}
	
	private async _start(): Promise<void> {
		try {
			let object: t.share = {
				onError: this.onError.bind(this),
				log: this.log,
				rabbitMQ: this.rabbitMQ,
				redis: this.redis,
				label: this.label,
				domain: this.domain,
				currentIp: this.currentIp,
			}
			let websocket = new Websocket(object)
			websocket.start()
			
			let dataHandler = new DataHandler(object)
			await dataHandler.setStatic()
			
			dataHandler.setDynamic(websocket.sockets, this.label)
			websocket.setDataHandler(dataHandler)
			
			let nextPath = this.currentPath + 'next/'
			let nextHandler = new NextHandler(object, nextPath)
			await nextHandler.start()
		} catch (error: unknown) {
			this.onError(this.label, '_start', error)
		}
	}
}

module.exports = Multiserver