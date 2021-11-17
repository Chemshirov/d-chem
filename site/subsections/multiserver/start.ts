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
	private _tsHandlers: Array<typeof TsHandler>
	
	constructor() {
		super()
		this.label = this.constructor.name
		this._tsHandlers = []
		this._start()
	}
	
	private async _start(): Promise<void> {
		try {
			await this._handleTsFiles()
			const Multiserver = require('./assets/Multiserver')
			new Multiserver(currentPath, this._tsHandlers).start()
		} catch (error) {
			this.onError(this.label, '_start', error)
		}
	}
	
	private async _handleTsFiles(): Promise<void> {
		try {
			let tsHandler = new TsHandler(this.onError.bind(this), this.log)
				tsHandler.tsDirectory = currentPath
				tsHandler.jsDirectory = '/usr/nodejs/assets'
				tsHandler.excludeDirectories = ['/next', './node_modules']
				tsHandler.excludeFiles = ['next-env.d.ts']
			await tsHandler.convertOnce()
			this._tsHandlers.push(tsHandler)
			
			let tsCommonHandler = new TsHandler(this.onError.bind(this), this.log)
				tsCommonHandler.tsDirectory = stagePath + '_common/'
				tsCommonHandler.jsRoot = '/usr/nodejs/assets'
				tsCommonHandler.jsDirectory = '/usr/nodejs/assets/common'
				tsCommonHandler.excludeDirectories = ['/next'] // Doesn't work without the line, see FilesWatcher.
			await tsCommonHandler.convertOnce()
			this._tsHandlers.push(tsCommonHandler)
		} catch (error: unknown) {
			this.onError(this.label, '_handleTsFiles', error)
		}
	}
}

new Start().start()
module.exports = Start