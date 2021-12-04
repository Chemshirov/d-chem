const tildaPath = (process.env.TILDA ?? '.') as string
const afterTildaPath = (process.env.AFTER_TILDA ?? '') as string
const currentPath = tildaPath + afterTildaPath
const stageString = (process.env.STAGE ?? '') as string
const stagePath = tildaPath + stageString + '/'

interface StarterType {
	new(): StarterType,
	onError: (className: string, method: string, error: unknown) => void,
	log: (...args: any) => void,
	start: () => void,
}
const Starter: StarterType = require(stagePath + '_common/Starter')
const TsHandler = require(stagePath + '_common/TsHandler')

class Start extends Starter {
	private readonly label: string
	
	constructor() {
		super()
		this.label = this.constructor.name
		this._start()
	}
	
	private async _start(): Promise<void> {
		try {
			let tsHandler = new TsHandler(this.onError.bind(this), this.log)
				tsHandler.tsDirectory = currentPath
				tsHandler.jsDirectory = '/usr/nodejs/assets'
			await tsHandler.convertOnce()
			const Playwright = require('./assets/Playwright')
			new Playwright(currentPath).start()
		} catch (error) {
			this.onError(this.label, '_start', error)
		}
	}
}

new Start().start()
module.exports = Start