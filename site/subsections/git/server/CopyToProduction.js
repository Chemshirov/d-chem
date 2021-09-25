const fs = require('fs')
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
				this.o.Main.log('Coping files to production')
				let tildaDevelopmentPath = process.env.TILDA + Settings.developmentStageName + '/*'
				let tildaProductionPath = process.env.TILDA + Settings.productionStageName + '/'
				let cmd = this._copyFilesCmd(tildaDevelopmentPath, tildaProductionPath)
				let sdaDevelopmentPath = sda + Settings.developmentStageName + '/' +  process.env.LABEL + '/'
				let sdaProductionPath = sda + Settings.productionStageName + '/' +  process.env.LABEL + '/'
				cmd += this._copyFilesCmd(sdaDevelopmentPath + 'Logins.js', sdaProductionPath)
				cmd += this._copyFilesCmd(sdaDevelopmentPath + 'Settings.js', sdaProductionPath)
				this.o.Main.log('cmd', cmd)
				await this.o.Main.exec(cmd)
				
				await this._replaceServiceNameInDockerComposeFiles(tildaProductionPath)
				
				this.o.Main.rabbitMQ.send({ label: 'Syncer', syncToSlave: tildaProductionPath })
				this.o.Main.rabbitMQ.send({ label: 'Syncer', syncToSlave: sdaProductionPath })
				
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
	
	async _replaceServiceNameInDockerComposeFiles(path) {
		try {
			let result = await this.o.Main.exec(`find ${path} -type f -name "docker-compose.yml"`)
			let dockerComposeFiles = result.replace(/[\n]+/g, ' ').trim().split(' ')
			for (let i = 0; i < dockerComposeFiles.length; i++) {
				let filePath = dockerComposeFiles[i]
				await this._replaceServiceNameInDockerComposeFile(filePath)
			}
		} catch(error) {
			this.o.Main.setError(this.label, '_replaceServiceNameInDockerComposeFiles', error)
		}
	}
	
	_replaceServiceNameInDockerComposeFile(filePath) {
		return new Promise(success => {
			fs.readFile(filePath, (error, data) => {
				if (error) {
					this.o.Main.setError(this.label, '_replaceServiceNameInDo... readFile ' + filePath, error)
				} else {
					let fileContent = data.toString()
					let regExp = /^(.+[a-z]+(:|\/)[^a-z]+)(d-)([a-z0-9]+:.+)$/gis
					let newFileContent = this.regexpRecursive(fileContent, regExp, '$1p-$4')
					
					fs.writeFile(filePath, newFileContent, (error) => {
						if (error) {
							this.o.Main.setError(this.label, '_replaceServiceNa... writeFile ' + filePath, error)
						} else {
							success()
						}
					})
				}
			})
		}).catch(error => {
			this.o.Main.setError(this.label, '_replaceServiceNameInDockerComposeFile', error)
		})
	}
	
	regexpRecursive(fileContent, regExp, replacer) {
		if ((regExp).test(fileContent)) {
			fileContent = fileContent.replace(regExp, replacer)
			return this.regexpRecursive(fileContent, regExp, replacer)
		} else {
			return fileContent
		}
	}
}

module.exports = CopyToProduction