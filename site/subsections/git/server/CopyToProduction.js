class CopyToProduction {
	constructor(o) {
		this.o = o
		this.label = this.constructor.name
		this.maxDumpAmount = 5
		this.chemPath = process.env.TILDA + 'production'
	}
	
	getDump() {
		return new Promise(async success => {
			let date = new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString()
				date = date.replace(/T/, '_').replace(/\..+$/, '')
				date = date.replace(/[\-\:]/g, '')
			let tarName = this.chemPath + date + '.tar.gz'
			let cmd = `tar czvf ` + tarName + ' ' + this.chemPath + 'server' + ' ' + this.chemPath + 'www'
			await this.o.Server.exec(cmd)
			await this._deleteOldDumps()
			success()
		}).catch(err => {
			this.o.Server.setError(this.label, 'getDump', err)
		})
	}
	
	copyFiles(gitCmd) {
		return new Promise(async success => {
			let filesToCopy = []
			let cmd = `${gitCmd} ls-files -c`
			await this.o.Server.exec(cmd, true).then(result => {
				let array = result.split(/\n/)
				array.forEach(file => {
					if ((/\//).test(file) && !(/\/\.html$/).test(file)) {
						filesToCopy.push([this.o.Server.tilda + 'chem_develop/' + file, this.chemPath + file])
					}
				})
			})
			for (let i = 0; i < filesToCopy.length; i++) {
				let pair = filesToCopy[i]
				await this._copyFile(pair[0], pair[1])
			}
			success()
		}).catch(err => {
			this.o.Server.setError(this.label, 'copyFiles', err)
		})
	}
	
	merge(gitCmd) {
		return new Promise(async success => {
			await this.o.Server.exec(`${gitCmd} checkout production`, true)
			await this.o.Server.exec(`${gitCmd} merge master`, true)
			await this.o.Server.exec(`${gitCmd} push`, true)
			await this.o.Server.exec(`${gitCmd} checkout master`, true)
			success()
		}).catch(err => {
			this.o.Server.setError(this.label, 'merge', err)
		})
	}
	
	_copyFile(from, to) {
		return new Promise(async success => {
			let cmd = `cp ${from} ${to}; chown 1000:1000 ${to};`
			await this.o.Server.exec(cmd)
			success()
		}).catch(err => {
			this.o.Server.setError(this.label, '_copyFile', err)
		})
	}
	
	_deleteOldDumps() {
		return new Promise(async success => {
			let dumpArray = []
			let cmd = `find ${this.chemPath} -maxdepth 1 -type f`
			await this.o.Server.exec(cmd).then(result => {
				let array = result.split(/\n/)
				array.forEach(file => {
					if ((/[0-9]{8}_[0-9]{6}\.tar\.gz$/).test(file)) {
						dumpArray.push(file)
					}
				})
			})
			await this._deleteOldDumpsRecursively(dumpArray.sort())
			success()
		}).catch(err => {
			this.o.Server.setError(this.label, '_deleteOldDumps', err)
		})
	}
	
	async _deleteOldDumpsRecursively(sortedDumps) {
		if (sortedDumps.length > this.maxDumpAmount) {
			let fileToDelete = sortedDumps.shift()
			let cmd = `rm ` + fileToDelete
			await this.o.Server.exec(cmd)
			this._deleteOldDumpsRecursively(sortedDumps)
		}
	}
}

module.exports = CopyToProduction