const fs = require('fs')
const childProcess = require('child_process')
const Settings = require('./Settings.js')

class NextHandler {
	constructor(onError, log, projectPath) {
		this.onError = onError
		this.log = log
		this.projectPath = projectPath
		this.label = this.constructor.name
		this.containerName = process.env.DOCKER_NAME + process.env.STAGE +'_' + process.env.NAME
	}
	
	async start() {
		try {
			if (!process.env.SHOW || process.env.STAGE === Settings.productionStageName) {
				await this._spawn('next build')
				await this._spawn('next start -p ' + Settings.port)
			} else {
				await this._spawn('next build')
				await this._spawn('next dev -p ' + Settings.port)
			}
		} catch (error) {
			this.onError(this.label, 'start', error)
		}
	}
	
	
	_spawn(cmd) {
		return new Promise(success => {
			let newProcess = childProcess.spawn(`cd ${this.projectPath} && ${cmd}`, {shell: true})
			newProcess.stdout.on('data', data => {
				let infoString = data.toString().trim()
				if (infoString.length > 1) {
					if (infoString.startsWith('error - ')) {
						this.onError(this.label, '_spawn next', error)
					} else {
						this.log(infoString)
					}
				}
				if (infoString.includes('ready - started server on')) {
					success()
				}
			})
			newProcess.stderr.on('data', error => {
				let errorString = error.toString()
				if (!errorString.startsWith('warn') || errorString.includes('Warning')) {
					this.log(errorString)
				} else {
					if (errorString.length > 2) {
						this.onError(this.label, '_spawn ' + cmd, errorString)
					}
				}
			})
			newProcess.on('close', () => {
				success()
			})
		}).catch(error => {
			this.onError(this.label, '_spawn', error)
		})
	}
}

module.exports = NextHandler