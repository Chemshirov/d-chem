const tildaPath = (process.env.TILDA ?? '.') as string
const afterTildaPath = (process.env.AFTER_TILDA ?? '') as string
const currentPath = tildaPath + afterTildaPath
const stageString = (process.env.STAGE ?? '') as string
const stagePath = tildaPath + stageString + '/'
const containerName = process.env.NAME as string

interface StarterType {
	new(): StarterType,
	onError: (className: string, method: string, error: unknown) => void,
	log: (...args: any) => void,
	start: () => void,
}

const Starter: StarterType = require(stagePath + '_common/Starter')
const TsHandler = require(stagePath + '_common/TsHandler')

export default class Start extends Starter {
	private readonly label: string
	private _tsHandlers: Array<typeof TsHandler>
	private readonly _tsJsDirName: string
	private readonly _tsJsPath: string
	
	constructor() {
		super()
		this.label = this.constructor.name
		this._tsHandlers = []
		this._tsJsDirName = 'assets'
		this._tsJsPath = '/usr/nodejs/' + this._tsJsDirName
		this._start()
	}
	
	private async _start(): Promise<void> {
		try {
			await this._handleTsFiles()
			let className = containerName.substring(0, 1).toUpperCase() + containerName.substring(1)
			const MainClass = require('./' + this._tsJsDirName + '/' + className)
			let main = new MainClass(currentPath)
			await main.start()
			let isMaster = await main.isMaster()
			if (isMaster) {
				for (let i = 0; i < this._tsHandlers.length; i++) {
					let tsHandler = this._tsHandlers[i]
					await tsHandler.watch()
				}
			}
		} catch (error) {
			this.onError(this.label, '_start', error)
		}
	}
	
	private async _handleTsFiles(): Promise<void> {
		try {
			let tsHandler = new TsHandler(this.onError.bind(this), this.log)
				tsHandler.tsDirectory = currentPath
				tsHandler.jsDirectory = this._tsJsPath
				tsHandler.excludeDirectories = ['/next', './node_modules']
				tsHandler.excludeFiles = ['next-env.d.ts']
			await tsHandler.convertOnce()
			this._tsHandlers.push(tsHandler)
			
			let tsCommonHandler = new TsHandler(this.onError.bind(this), this.log)
				tsCommonHandler.tsDirectory = stagePath + '_common/'
				tsCommonHandler.jsRoot = this._tsJsPath
				tsCommonHandler.jsDirectory = this._tsJsPath + '/common'
			await tsCommonHandler.convertOnce()
			this._tsHandlers.push(tsCommonHandler)
		} catch (error: unknown) {
			this.onError(this.label, '_handleTsFiles', error)
		}
	}
}

new Start().start()