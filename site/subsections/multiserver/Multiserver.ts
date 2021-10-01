const tildaPath = (process.env.TILDA ?? '.') as string
const stageString = (process.env.STAGE ?? '') as string
const stagePath = (tildaPath + stageString + '/') as string
const Starter = require(stagePath + '_common/Starter.js')
const TsHandler = require(stagePath + '_common/TsHandler')

class Multiserver extends Starter {
	constructor() {
		super()
		this.label = this.constructor.name
	}
	
	async atStart() {
		try {
			await this._handleTsFiles()
			
			await new Promise(() => {})
		} catch (error) {
			this.onError(this.label, '_handleTsFiles', error)
		}
	}
	
	async _handleTsFiles() {
		try {
			let tsHandler = new TsHandler(this.onError.bind(this), this.log)
			let afterTildaPath = (process.env.AFTER_TILDA ?? '') as string
			tsHandler.tsDirectory = tildaPath + afterTildaPath
			tsHandler.jsDirectory = '/usr/nodejs/assets'
			tsHandler.excludeDirectories = ['./.next', './node_modules']
			tsHandler.excludeFiles = ['next-env.d.ts']
			await tsHandler.convertOnce()
			await tsHandler.watch()
		} catch (error) {
			this.onError(this.label, '_handleTsFiles', error)
		}
	}
}

new Multiserver().start()
module.exports = Multiserver