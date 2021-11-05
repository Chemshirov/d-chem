const child_process = require('child_process')
const cpuAmount = require('os').cpus().length
const fs = require('fs')
const sda = '/usr/nodejs/sda/'
const Settings = require('../_common/Settings.js')
const siteSettings = require(sda + process.env.STAGE + '/' + Settings.label + '/Settings.js')
const Starter = require('../_common/Starter.js')

class Dockerrun extends Starter {
	constructor(currentPath) {
		super()
		this.currentPath = currentPath
		this.label = this.constructor.name
		this._startArray = []
		this._startObject = {}
		this.prePath = process.env.STAGE + '/' + Settings.label + '/'
		this.defaultSettings = {
			[this.prePath + 'watcher/']: [true],
			[this.prePath + 'worker/']: [Math.ceil(cpuAmount / 2)]
		}
	}
	
	async atStart() {
		try {
			await this._setDomainAndIps()
			await this.rabbitMQ.receive(this._onReceive.bind(this))
			this._writeContainersInfoToRedis()
			await this._startDockers()
		} catch (error) {
			this.onError(this.label, 'atStart', error)
		}
	}
	
	async _onReceive(object) {
		try {
			if (object.type === 'start') {
				let path = object.path
				if (object.hostname) {
					if (object.hostname === '_all') {
						path = process.env.STAGE + '/'
					} else {
						path = await this._getPathByHostname(object.hostname)
					}
				}
				if (path) {
					let date = Date.now()
					this._startArray.push(date)
					let settings = object.settings
					if (!settings) {
						settings = this.defaultSettings[path]
					}
					this._startObject[date] = { path, settings }
					this._containerUp()
				}
			} else if (object.type === 'started') {
				if (object.date) {
					if (this._startObject[object.date]) {
						if (this._startObject[object.date].success) {
							this._startObject[object.date].success(true)
						}
						delete this._startObject[object.date]
					}
				}
			} else if (object.type === 'StaticsSetterHasDone') {
				if (process.env.STAGE === Settings.developmentStageName) {
					this._localStart(this.prePath + 'proxy/')
				}
			}
			this.log(object)
		} catch (error) {
			this.onError(this.label, '_onReceive', error)
		}
	}
	
	async _startDockers() {
		try {
			if (process.env.START) {
				await this._localStart(this.prePath + 'subsections/finance6/')
				await this._localStart(this.prePath + 'subsections/git/')
				await this._localStart(this.prePath + 'subsections/logs/')
				await this._localStart(this.prePath + 'subsections/multiserver/')
				await this._localStart(this.prePath + 'worker/')
				await this._localStart(this.prePath + 'watcher/')
			}
		} catch(error) {
			this.onError(this.label, '_startDockers', error)
		}
	}
	
	_localStart(path, settings) {
		return new Promise(success => {
			if (!settings) {
				settings = this.defaultSettings[path]
			}
			let date = Date.now()
			this._startObject[date] = { path, settings, success }
			this._setMarker(date)
		}).catch(error => {
			this.onError(this.label, '_localStart', error)
		})
	}
	
	_containerUp() {
		let date = this._startArray.shift()
		if (date) {
			this._setMarker(date)
		}
	}
	
	_setMarker(date) {
		return new Promise(success => {
			let data = this._startObject[date]
			if (!date) {
				date = Date.now()
			}
			let settings = ''
			if (data.settings) {
				settings = data.settings.join(' ')
			}
			let string = `${data.path} ${settings} ${date}`
			let cmd = `echo ${string} > ${this.currentPath}toRun/dockerToRun${date}.temp`
			child_process.exec(cmd, (error, stdout, stderr) => {
				if (error) {
					this.onError(this.label, '_setMarker child_process ' + cmd, error)
				} else {
					success()
				}
			})
		}).catch(error => {
			this.onError(this.label, '_setMarker', error)
		})
	}
	
	async _setDomainAndIps() {
		try {
			let currentIp = await siteSettings.getCurrentIp()
			let anotherIp = siteSettings.getAnotherIp(currentIp)
			let domain = siteSettings.stageIpDomain[process.env.STAGE][currentIp]
			let anotherDomain = siteSettings.stageIpDomain[process.env.STAGE][anotherIp]
			let predispositionalMasterIp = siteSettings.predispositionalMasterIp
			
			let label = 'commonInfo'
			await this.redis.hset(label, 'currentIp', currentIp)
			await this.redis.hset(label, 'anotherIp', anotherIp)
			await this.redis.hset(label, 'domain', domain)
			await this.redis.hset(label, 'anotherDomain', anotherDomain)
			await this.redis.hset(label, 'predispositionalMasterIp', predispositionalMasterIp)
			
			let fileDate = fs.readFileSync(sda + process.env.STAGE + '/startDate.txt')
			if (fileDate) {
				let date = +fileDate.toString()
				await this.redis.hset(label, 'systemUptime', date)
			}
		} catch (error) {
			this.onError(this.label, '_setDomainAndIps', error)
		}
	}
	
	async _getPathByHostname(hostname) {
		try {
			let key = 'Containers:' + hostname
			let path = await this.redis.hget(key, 'path')
			if (!path) {
				let { object } = Settings.otherContainters(Settings.stage)
				if (object[hostname]) {
					path = object[hostname].path
				}
			}
			return path
		} catch (error) {
			this.onError(this.label, '_getPathByHostname', error)
		}
	}
	
	_writeContainersInfoToRedis() {
		let path = process.env.TILDA + process.env.STAGE
		let fileMarker = 'create-image.sh'
		let cmd = `find "${path}" -type f -name "${fileMarker}"`
		child_process.exec(cmd, async (error, stdout, stderr) => {
			try {
				if (error) {
					this.onError(this.label, '_setContainersObject ' + cmd, error)
				} else {
					let prefix = process.env.STAGE.substring(0, 1) + '-'
					let string = stdout.toString()
					let array = string.split('\n')
					for (let i = 0; i < array.length; i++) {
						let fileString = array[i]
						if (fileString.length > 2) {
							let directory = fileString.replace(fileMarker, '')
							let name = directory.replace(/^.+\/([^\/]+)\/$/, '$1')
							let hasLabel = directory.includes(Settings.label)
							let hostname = prefix + (hasLabel ? Settings.label + '_' : '') + name
							let containerPath = directory.replace(path, process.env.STAGE)
							let type = '1_main'
							if (directory.includes('/subsections/')) {
								type = '2_subsections'
							}
							let key = 'Containers:' + hostname
							await this.redis.hset(key, 'name', name)
							await this.redis.hset(key, 'path', containerPath)
							await this.redis.hset(key, 'type', type)
						}
					}
				}
			} catch (error) {
				this.onError(this.label, '_writeContainersInfoToRedis catch', error)
			}
		})
	}
}

module.exports = Dockerrun