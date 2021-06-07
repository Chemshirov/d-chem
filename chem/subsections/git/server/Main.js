const child_process = require('child_process')

class Main {
	constructor(onError) {
		this.label = this.constructor.name
		this._onError = onError
	}
	
	async start() {
		try{
			await this._configGit()
		} catch(err) {
			this._onError(this.label, 'start', err)
		}
	}
	
	_configGit() {
		return new Promise(async success => {
			await this.exec(`git config --global user.email 'Konstantin@Chemshirov.ru'`, true)
			await this.exec(`git config --global user.name 'Konstantin Chemshirov'`, true)
			success()
		}).catch(err => {
			this._onError(this.label, '_configGit', err)
		})
	}
	
	exec(cmd, isGit) {
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
						this._onError(this.label, 'child_process.exec ' + cmd, err)
					}
				}
				let result = stdin
				if (stdout && !stdin) {
					result = stdout
				}
				success(result.toString())
			})
		}).catch(err => {
			this._onError(this.label, '_exec', err)
		})
	}
}

module.exports = Main