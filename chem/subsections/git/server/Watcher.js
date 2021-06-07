class Watcher {
	constructor(o) {
		this.o = o
	}
	
	start() {
		this.wwwDir = this.o.Server.files + 'www'
		let array = [this.o.Server.files + 'www']
		Object.keys(this.o.Projects.projects).forEach(name => {
			array.push(this.o.Projects.projects[name].Project.workingDirectory)
		})
		array.forEach(path => {
			this._allDirectories(path).then(directories => {
				(directories || []).forEach(dir => {
					if (dir !== '_tempFiles') {
						this._watching(dir)
					}
				})
			})
		})
	}
	
	_watching(dir) {
		require('fs').watch(dir, (eventType, fileName) => {
			if (!(/_webpack/).test(fileName)) { 
				this._whenFileHasChanged(fileName, dir)
			}
		})
	}
	
	_whenFileHasChanged(fileName, dir) {
		if (this._whenFileHasChangedST) {
			clearTimeout(this._whenFileHasChangedST)
		}
		this._whenFileHasChangedST = setTimeout(async () => {
			if (this.wwwDir === dir) {
				this.o.Server.sendReload(false)
			} else {
				this.o.Server.sendReload(true)
			}
		}, 100)
	}
	
	_allDirectories(path) {
		return new Promise(success => {
			let cmd = `find ${path} -type d`
			this.o.Server.exec(cmd).then(stdin => {
				success(stdin.toString().trim().split('\n'))
			})
		}).catch(err => {
			this.o.Errors.log('Watcher', '_allDirectories', err)
		})
	}
}

module.exports = Watcher