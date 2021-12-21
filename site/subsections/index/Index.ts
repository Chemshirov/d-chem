import * as fs from 'fs'
import * as t from './types'
import * as tc from '../../../_common/types'
import Websocket from './Websocket'

const FileHandler: tc.FileHandler = require('../stagePath/_common/FileHandler')
const NextHandler: tc.NextHandler = require('../stagePath/_common/NextHandler')
const Settings: tc.settings = require('../stagePath/_common/Settings')
const Starter: tc.Starter = require('../stagePath/_common/Starter')

class Index extends Starter {
	private currentPath: string
	private readonly label: string
	
	constructor(currentPath: string) {
		super()
		this.currentPath = currentPath
		this.label = this.constructor.name
		process.env.CURRENT_SDA = Settings.subsectionsPath + this.label.toLowerCase() + '/'
	}
	
	private async atStart(): Promise<void> {
		try {
			await this.getDomainAndIps()
			process.env.ANOTHER_DOMAIN = this.anotherDomain
			let object: t.share = {
				onError: this.onError.bind(this),
				log: this.log,
				rabbitMQ: this.rabbitMQ,
				redis: this.redis,
				label: this.label,
				domain: this.domain,
				currentIp: this.currentIp,
				anotherIp: this.anotherIp,
			}
			
			let websocket = new Websocket(object)
			websocket.start()
			
			let nextPath = this.currentPath + 'next/'
			let nextHandler = new NextHandler(object, nextPath)
			await nextHandler.start()
			
			this._getData()
		} catch (error: unknown) {
			this.onError(this.label, 'atStart', error)
		}
	}
	
	private async _getData(object?: any): Promise<void> {
		const currentSda = (process.env.CURRENT_SDA ?? '') as string
		if (!object) {
			await this.rabbitMQ.receive({ label: this.label, callback: this._getData.bind(this) })
			let label = 'chem-node'
			if (Settings.stage === Settings.developmentStageName) {
				label = 'chem-dev'
			}
			try {
				const subsectionsBuffer = fs.readFileSync(currentSda + 'subsections.json')
				const subsections = JSON.parse(subsectionsBuffer.toString()) as Array<string>
				this.rabbitMQ.send({ label, message: { type: 'getData', subsections } })
			} catch (e) {}
		} else {
			let fileHandler = new FileHandler(this.onError.bind(this), currentSda + 'stageSensitive/data.json')
			await fileHandler.objectToFile(object)
		}
	}
}

module.exports = Index