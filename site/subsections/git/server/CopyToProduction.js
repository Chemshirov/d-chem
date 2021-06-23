const sda = '/usr/nodejs/sda/'
const Settings = require('../../../../_common/Settings.js')

class CopyToProduction {
	constructor(o) {
		this.o = o
		this.label = this.constructor.name
	}
	
	copyFiles() {
		return new Promise(async success => {
			try {
				let tildaDevelopmentPath = process.env.TILDA + Settings.developmentStageName + '/*'
				let tildaProductionPath = process.env.TILDA + Settings.productionStageName + '/'
				let cmd = this._copyFilesCmd(tildaDevelopmentPath, tildaProductionPath)
				let sdaDevelopmentPath = sda + Settings.developmentStageName + '/' +  process.env.LABEL + '/'
				let sdaProductionPath = sda + Settings.productionStageName + '/' +  process.env.LABEL + '/'
				cmd += this._copyFilesCmd(sdaDevelopmentPath + 'Logins.js', sdaProductionPath)
				cmd += this._copyFilesCmd(sdaDevelopmentPath + 'Settings.js', sdaProductionPath)
				await this.o.Main.exec(cmd)
				
				await this._syncToSlave(tildaProductionPath)
				await this._syncToSlave(sdaProductionPath)
				
				success()
			} catch(error) {
				this.o.Main.setError(this.label, 'copyFiles async', error)
			}
		}).catch(error => {
			this.o.Main.setError(this.label, 'copyFiles', error)
		})
	}
	
	merge(gitCmd) {
		return new Promise(async success => {
			try {
				await this.o.Main.exec(`${gitCmd} checkout production`, true)
				await this.o.Main.exec(`${gitCmd} merge master`, true)
				await this.o.Main.exec(`${gitCmd} push`, true)
				await this.o.Main.exec(`${gitCmd} checkout master`, true)
				success()
			} catch(error) {
				this.o.Main.setError(this.label, 'merge async', error)
			}
		}).catch(error => {
			this.o.Main.setError(this.label, 'merge', error)
		})
	}
	
	_copyFilesCmd(from, to) {
		let cmd = `cp -r ${from} ${to};`
		cmd += `chown -R 1000:1000 ${to};`
		return cmd
	}
	
	async _syncToSlave(path) {
		try {
			await this.o.Main.rabbitMQ.sendToAll('remoteSyncer', {
				path,
				slaveToMaster: false
			})
		} catch(error) {
			this.o.Main.setError(this.label, '_syncToSlave', error)
		}
	}
}

module.exports = CopyToProduction