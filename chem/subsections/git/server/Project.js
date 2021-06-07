class Project {
	constructor(object, name, props) {
		this.o = object
		this.name = name
		Object.keys(props).forEach(prop => {
			this[prop] = props[prop]
		})
		this.gitDirsString = ''
		if ((/^chem/).test(this.name)) {
			this.gitDirsString = 'server www'
			this.superRepository = 'server www'
		}
		
		this._init()
		this._setFetchInterval()
	}
	
	_init() {
		return new Promise(success => {
			this.gitCmd = `git --git-dir='${this.gitPath}'`
			let cmd = this.gitCmd + ` remote`
			this.o.Server.exec(cmd, true).then(stdin => {
				if ((/origin/).test(stdin.toString())) {
					success()
				} else {
					let cmd = this.gitCmd + ` remote add origin ` + this.barePath
					this.o.Server.exec(cmd).then(() => {
						success()
					})
				}
			})
		}).catch(err => {
			this.o.Server.setError('Project', '_init', err)
		})
	}
	
	renew() {
		return new Promise(async success => {
			await this._getWorkingDirectory()
			await this._getGitHubPath()
			await this._getBranch()
			await this._getAbleToPull()
			await this.getChanged()
			await this.getAbleToPush()
			success()
		}).catch(err => {
			this.o.Server.setError('Project', 'renew', err)
		})
	}
	
	_getWorkingDirectory() {
		return new Promise(async success => {
			let cmd = this.gitCmd + ` rev-parse --show-cdup`
			this.o.Server.exec(cmd, true).then(result => {
				let string = result.replace(/\n/g, '')
				this.workingDirectory = string
				if (!(/\-\-work\-tree/).test(this.gitCmd)) {
					this.gitCmd += ` --work-tree='${this.workingDirectory}'`
				}
				success()
			})
		}).catch(err => {
			this.o.Server.setError('Project', '_getWorkingDirectory', err)
		})
	}
	
	_getGitHubPath() {
		return new Promise(async success => {
			let cmd = this.gitCmd + ` remote get-url --push origin`
			this.o.Server.exec(cmd, true).then(result => {
				let string = result.replace(/\n/g, '')
				if ((/^git@github\.com/).test(string)) {
					if (!this.barePath) {
						this.barePath = string
					}
				}
				success()
			})
		}).catch(err => {
			this.o.Server.setError('Project', '_getWorkingDirectory', err)
		})
	}
	
	_getBranch() {
		return new Promise(async success => {
			let cmd = this.gitCmd + ` rev-parse --abbrev-ref HEAD`
			this.o.Server.exec(cmd, true).then(result => {
				let string = result.replace(/\n/g, '')
				this.currentBranch = string
				success()
			})
		}).catch(err => {
			this.o.Server.setError('Project', '_getBranch', err)
		})
	}
	
	_getAbleToPull(sendReload) {
		return new Promise(async success => {
			if (this.barePath) {
				let fetchCmd = this.gitCmd + ` fetch --all`
				await this.o.Server.exec(fetchCmd, true)
				let cmd = this.gitCmd + ` diff origin/master`
				this.o.Server.exec(cmd, true).then(result => {
					let mark = '!@!@!@!'
					let regExp = /diff --git a([^@ ]+)[^@]+@@/gm
					let string = result.replace(regExp, mark + '$1\n@@')
						string = string.replace(/(@@[^\n@]+@@)[^\n@]*/gm, '$1')
						string = string.replace(/\\ No newline at end of file/gm, '')
						string = string.replace(new RegExp('^' + mark), '')
					this.ableToBePulled = string.split(mark)
					let pullSha256 = require('crypto').createHmac('sha256', '').update(result).digest('hex')
					if (this.pullSha256 !== pullSha256) {
						this.pullSha256 = pullSha256
						if (sendReload) {
							this.o.Server.sendReload(true)
						}
					}
					success()
				})
			} else {
				success()
			}
		}).catch(err => {
			this.o.Server.setError('Project', 'getChanged', err)
		})
	}
	
	getChanged() {
		return new Promise(success => {
			let cmd = this.gitCmd + ` add ${this.gitDirsString} -u -n`
			this.o.Server.exec(cmd, true).then(stdin => {
				let changedFiles = []
				if (stdin) {
					let array = stdin.toString().split('\n')
					array.forEach(string => {
						let fileString = string.replace(/add '([^ ]+)'/, '$1')
						if (fileString) {
							changedFiles.push(fileString)
						}
					})
				}
				this.changedFiles = changedFiles
				success()
			})
		}).catch(err => {
			this.o.Server.setError('Project', 'getChanged', err)
		})
	}
	
	getAbleToPush() {
		return new Promise(success => {
			let cmd = this.gitCmd + ` cherry -v`
			this.o.Server.exec(cmd, true).then(result => {
				if ((/[a-f0-9]{32,}/).test(result)) {
					this.ableToBePushed = result.split(/\n/)
				} else {
					this.ableToBePushed = false
				}
				success()
			})
		}).catch(err => {
			this.o.Server.setError('Project', 'getChanged', err)
		})
	}
	
	commit(data) {
		return new Promise(async success => {
			let addCmd = ``
			data.files.forEach(file => {
				addCmd += this.gitCmd + ` add ` + file + `; `
			})
			await this.o.Server.exec(addCmd, true)
			let text = (data.text + '').replace(/'/g, '’')
			let commitCmd = this.gitCmd + ` commit -m '${text}'`
			await this.o.Server.exec(commitCmd, true)
			success()
		}).catch(err => {
			this.o.Server.setError('Project', 'commit', err)
		})
	}
	
	cli(value) {
		return new Promise(async success => {
			let cmd = this.gitCmd + ` ` + value
			if (value && value.length > 2) {
				await this.o.Server.exec(cmd, true).then(result => {
					this.cliResult = {
						value: this.gitCmd + ` ` + value,
						result: result.replace(/</g, '&lt;').replace(/>/g, '&gt;')
					}
				})
			} else {
				this.cliResult = false
			}
			success()
		}).catch(err => {
			this.o.Server.setError('Project', 'cli', err)
		})
	}
	
	cliShows(value) {
		return new Promise(async success => {
			let cmdEnd = ``
			if (value === 'graph') {
				cmdEnd = `log --oneline --graph --branches --decorate --all -20`
			} else if (value === 'branches') {
				cmdEnd = `branch -a`
			}
			if (cmdEnd) {
				let cmd = this.gitCmd + ` ` + cmdEnd
				await this.o.Server.exec(cmd, true).then(result => {
					this.cliResult = {
						value: this.gitCmd + ` ` + cmdEnd,
						result: result.replace(/</g, '&lt;').replace(/>/g, '&gt;')
					}
				})
			}
			success()
		}).catch(err => {
			this.o.Server.setError('Project', 'cliShows', err)
		})
	}
	
	copyToProduction() {
		return new Promise(async success => {
			await this.o.CopyToProduction.getDump()
			await this.o.CopyToProduction.copyFiles(this.gitCmd)
			await this.o.CopyToProduction.merge(this.gitCmd)
			await this.cliShows('graph')
			success()
		}).catch(err => {
			this.o.Server.setError('Project', 'copyToProduction', err)
		})
	}
	
	push() {
		return new Promise(success => {
			let pushCmd = this.gitCmd + ` push`
			this.o.Server.exec(pushCmd, true).then(result => {
				if (result === 'pullFirst') {
					this[result] = true
				}
				success()
			})
		}).catch(err => {
			this.o.Server.setError('Project', 'push', err)
		})
	}
	
	pushAnyway() {
		return new Promise(success => {
			let cmd = this.gitCmd + ` push -f origin master`
			this.o.Server.exec(cmd, true).then(result => {
				success()
			})
		}).catch(err => {
			this.o.Server.setError('Project', 'pushAnyway', err)
		})
	}
	
	pull() {
		return new Promise(async success => {
			let cmd = this.gitCmd + ` pull`
			await this.o.Server.exec(cmd, true)
			success()
		}).catch(err => {
			this.o.Server.setError('Project', 'pull', err)
		})
	}
	
	_setFetchInterval() {
		if (!this._fetchSI) {
			this._fetchSI = setInterval(() => {
				this._getAbleToPull('sendReload')
			}, 1000 * 60)
		}
	}
}

module.exports = Project