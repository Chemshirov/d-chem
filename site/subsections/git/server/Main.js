const child_process = require('child_process')
const CopyToProduction = require('./CopyToProduction.js')
const Html = require('./Html.js')
const Projects = require('./Projects.js')
const Servers = require('./Servers.js')
const Settings = require('../../../../_common/Settings.js')
const Watcher = require('./Watcher.js')

const sda = '/usr/nodejs/sda/'
const Logins = require(sda + process.env.STAGE + '/' + process.env.LABEL + '/Logins.js')

class Main {
	constructor(onError, log, rabbitMQ, domain, label) {
		this._onError = onError
		this.log = log
		this.rabbitMQ = rabbitMQ
		this.domain = domain
		this.label = label
		this.sda = sda
		this.errorObject = {}
		this.startDate = Date.now()
	}
	
	async start() {
		try{
			this.rabbitMQ.receive({ label: 'Watcher', callback: this._onWatcher.bind(this) })
			await this._configGit()
			this.o = {}
			this.o.Main = this
			
			this.servers = new Servers(this.setError.bind(this))
			await this.servers.start(this.o, [Settings.port])
			
			this.o.Html = new Html(this.o)
			this.o.Projects = new Projects(this.o)
			await this.o.Projects.start()
			
			this.o.CopyToProduction = new CopyToProduction(this.o)
		} catch(err) {
			this.setError(this.label, 'start', err)
		}
	}
	
	exec(cmd, isGit) {
		if (cmd) {
			if (isGit) {
				cmd = cmd.replace(/"/g, '\\"')
				cmd = `/bin/su -c "${cmd}" - node;`
			}
			return new Promise(success => {
				child_process.exec(cmd, (err, stdin, stdout) => {
					if (err) {
						let ok = false
						if (typeof err === 'object') {
							let errorString = err.toString().replace(/[\n]/g, '; ')
							let case01 = 'Updates were rejected because the tip of your current branch is behind'
							if ((new RegExp(case01)).test(errorString)){
								ok = true
								success('pullFirst')
							}
							let case02 = 'Could not find a tracked remote branch, please specify <upstream> manually'
							if ((new RegExp(case02)).test(errorString)){
								ok = true
								success('branchIsNotTracked')
							}
						}
						if (!ok) {
							let notErrorString = 'ssh: connect to host github.com port 22: Operation timed out'
							let notError = (typeof err === 'object' && (err.message + '').includes(notErrorString))
							if (!notError) {
								this.setError(this.label, 'child_process.exec ' + cmd, err)
							}
						}
					}
					let result = stdin
					if (stdout && !stdin) {
						result = stdout
					}
					success(result.toString())
				})
			}).catch(err => {
				this.setError(this.label, '_exec', err)
			})
		}
	}
	
	sendReload(renewHtml) {
		return new Promise(async success => {
			if (renewHtml) {
				await this.o.Html.renew()
				this.o.Sockets.emit({reload: true})
			}
			this.o.Sockets.emit({reload: true})
		}).catch(err => {
			this.setError(this.label, 'sendReload', err)
		})
	}
	
	setError(className, func, error) {
		this.errorObject[Date.now()] = {className, func, error}
		this._onError(className, func, error)
	}
	
	_onWatcher(object) {
		if (object) {
			if (object.type === 'FileHasChanged') {
				if (!(object.directory + '').includes('.next')) {
					let path = [process.env.STAGE, process.env.LABEL, 'subsections', process.env.NAME, 'www'].join('/')
					if (object.directory.includes(path)) {
						this.sendReload(false)
					} else {
						this.sendReload(true)
					}
				}
			}
		}
	}
	
	_configGit() {
		return new Promise(async success => {
			await this.exec(`git config --global user.email '${Logins.chemshirovEmail}'`, true)
			await this.exec(`git config --global user.name '${Logins.chemshirovFullName}'`, true)
			success()
		}).catch(err => {
			this.setError(this.label, '_configGit', err)
		})
	}
}

module.exports = Main