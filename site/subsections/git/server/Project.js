class Project {
	constructor(object, name, props) {
		this.o = object
		this.name = name
		Object.keys(props).forEach(prop => {
			this[prop] = props[prop]
		})
		this.label = this.constructor.name
		this._init()
		this._setFetchInterval()
	}
	
	_init() {
		return new Promise(success => {
			this.gitCmd = `git --git-dir='${this.gitPath}'`
			let cmd = this.gitCmd + ` remote`
			this.o.Main.exec(cmd, true).then(stdin => {
				if ((/origin/).test(stdin.toString())) {
					success()
				} else {
					let cmd = this.gitCmd + ` remote add origin ` + this.barePath
					this.o.Main.exec(cmd).then(() => {
						success()
					})
				}
			})
		}).catch(err => {
			this.o.Main.setError(this.label, '_init', err)
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
			this.o.Main.setError(this.label, 'renew', err)
		})
	}
	
	_getWorkingDirectory() {
		return new Promise(async success => {
			let cmd = this.gitCmd + ` rev-parse --show-cdup`
			this.o.Main.exec(cmd, true).then(result => {
				let string = result.replace(/\n/g, '')
				this.workingDirectory = string
				if (!(/\-\-work\-tree/).test(this.gitCmd)) {
					this.gitCmd += ` --work-tree='${this.workingDirectory}'`
				}
				success()
			})
		}).catch(err => {
			this.o.Main.setError(this.label, '_getWorkingDirectory', err)
		})
	}
	
	_getGitHubPath() {
		return new Promise(async success => {
			let cmd = this.gitCmd + ` remote get-url --push origin`
			this.o.Main.exec(cmd, true).then(result => {
				let string = result.replace(/\n/g, '')
				if ((/^git@github\.com/).test(string)) {
					if (!this.barePath) {
						this.barePath = string
					}
				}
				success()
			})
		}).catch(err => {
			this.o.Main.setError(this.label, '_getGitHubPath', err)
		})
	}
	
	_getBranch() {
		return new Promise(async success => {
			let cmd = this.gitCmd + ` rev-parse --abbrev-ref HEAD`
			this.o.Main.exec(cmd, true).then(result => {
				let string = result.replace(/\n/g, '')
				this.currentBranch = string
				success()
			})
		}).catch(err => {
			this.o.Main.setError(this.label, '_getBranch', err)
		})
	}
	
	_getAbleToPull(sendReload) {
		return new Promise(async success => {
			if (this.barePath) {
				let fetchCmd = this.gitCmd + ` fetch --all`
				await this.o.Main.exec(fetchCmd, true)
				let cmd = this.gitCmd + ` diff origin/master`
				this.o.Main.exec(cmd, true).then(result => {
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
							this.o.Main.sendReload(true)
						}
					}
					success()
				})
			} else {
				success()
			}
		}).catch(err => {
			this.o.Main.setError(this.label, '_getAbleToPull', err)
		})
	}
	
	getChanged() {
		return new Promise(success => {
			let cmd = this.gitCmd + ` add ${this.workingDirectory} -u -n`
			this.o.Main.exec(cmd, true).then(stdin => {
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
			this.o.Main.setError(this.label, 'getChanged', err)
		})
	}
	
	getAbleToPush() {
		return new Promise(success => {
			let cmd = this.gitCmd + ` cherry -v`
			this.o.Main.exec(cmd, true).then(result => {
				if ((/[a-f0-9]{32,}/).test(result)) {
					this.ableToBePushed = result.split(/\n/)
				} else {
					this.ableToBePushed = false
				}
				success()
			})
		}).catch(err => {
			this.o.Main.setError(this.label, 'getAbleToPush', err)
		})
	}
	
	commit(data) {
		return new Promise(async success => {
			let addCmd = ``
			data.files.forEach(file => {
				addCmd += this.gitCmd + ` add ` + file + `; `
			})
			await this.o.Main.exec(addCmd, true)
			let text = (data.text + '').replace(/'/g, '’')
			let commitCmd = this.gitCmd + ` commit -m '${text}'`
			await this.o.Main.exec(commitCmd, true)
			success()
		}).catch(err => {
			this.o.Main.setError(this.label, 'commit', err)
		})
	}
	
	cli(value) {
		return new Promise(async success => {
			let cmd = this.gitCmd + ` ` + value
			if (value && value.length > 2) {
				await this.o.Main.exec(cmd, true).then(result => {
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
			this.o.Main.setError(this.label, 'cli', err)
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
				await this.o.Main.exec(cmd, true).then(result => {
					this.cliResult = {
						value: this.gitCmd + ` ` + cmdEnd,
						result: result.replace(/</g, '&lt;').replace(/>/g, '&gt;')
					}
				})
			}
			success()
		}).catch(err => {
			this.o.Main.setError(this.label, 'cliShows', err)
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
			this.o.Main.setError(this.label, 'copyToProduction', err)
		})
	}
	
	push() {
		return new Promise(success => {
			let pushCmd = this.gitCmd + ` push`
			this.o.Main.exec(pushCmd, true).then(result => {
				if (result === 'pullFirst') {
					this[result] = true
				}
				success()
			})
		}).catch(err => {
			this.o.Main.setError(this.label, 'push', err)
		})
	}
	
	pushAnyway() {
		return new Promise(success => {
			let cmd = this.gitCmd + ` push -f origin master`
			this.o.Main.exec(cmd, true).then(result => {
				success()
			})
		}).catch(err => {
			this.o.Main.setError(this.label, 'pushAnyway', err)
		})
	}
	
	pull() {
		return new Promise(async success => {
			let cmd = this.gitCmd + ` pull`
			await this.o.Main.exec(cmd, true)
			success()
		}).catch(err => {
			this.o.Main.setError(this.label, 'pull', err)
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