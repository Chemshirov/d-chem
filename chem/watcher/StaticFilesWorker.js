const child_process = require('child_process')
const { parentPort } = require('worker_threads')

const Settings = require('../../_common/Settings.js')
const StaticAddRoute = require('./StaticAddRoute.js')

class StaticFilesWorker {
	constructor() {
		this.label = this.constructor.name
		
		this._routeTable = Settings.staticRouteTable()
		this._addRoute = new StaticAddRoute(this._onError.bind(this))
		this._getRoutes()
	}
	
	async _getRoutes() {
		try {
			this.count = 0
			let paths = Object.keys(this._routeTable)
			for (let i = 0; i < paths.length; i++) {
				let path = paths[i]
				await this._getFiles(path)
			}
			parentPort.postMessage({ type: 'done', count: this.count })
		} catch(err) {
			this._onError(this.label, '_getRoutes', err)
		}
	}
	
	_getFiles(path) {
		return new Promise(success => {
			let cmd = `find ${path} -type f`
			child_process.exec(cmd, (err, stdout, stderr) => {
				if (err) {
					this._onError(this.label, '_getLiraries child_process', err)
				} else {
					let array = stdout.split('\n')
					array.forEach(fileString => {
						if (!(/\.(mp[3-4]|map)$/).test(fileString)) {
							Object.keys(this._routeTable).forEach(beginning => {
								let regExp = new RegExp('^' + beginning)
								if ((regExp).test(fileString)) {
									let replacement = this._routeTable[beginning]
									if (typeof replacement === 'object') {
										replacement.forEach(toClientsPath => {
											let clientsPath = fileString.replace(regExp, toClientsPath)
											this._addRoute.work(clientsPath, fileString)
											this.count++
										})
									}
								}
							})
						}
					})
					success()
				}
			})
		}).catch(err => {
			this._onError(this.label, '_getFiles', err)
		})
	}
	
	_onError(className, method, error) {
		parentPort.postMessage({ type: 'error', className, method, error })
	}
}

new StaticFilesWorker()