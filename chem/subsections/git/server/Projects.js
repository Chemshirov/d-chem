class Projects {
	constructor(object) {
		this.o = object
		this.projectClass = require(this.o.Server.files + 'server/Project.js')
		this.projects = {}
	}
	
	start() {
		this.projects = {}
		return new Promise(async success => {
			await this._getNames()
			await this._getBares()
			let array = Object.keys(this.projects)
			for (let i = 0; i < array.length; i++) {
				let name = array[i]
				let Project = new this.projectClass(this.o, name, this.projects[name])
				this.projects[name].Project = Project
				await Project.renew()
			}
			success()
		}).catch(err => {
			this.o.Server.setError('Projects', '_init', err)
		})
	}
	
	renew() {
		return new Promise(async success => {
			let array = Object.keys(this.projects)
			for (let i = 0; i < array.length; i++) {
				let name = array[i]
				let Project = this.projects[name].Project
				await Project.renew()
			}
			success()
		}).catch(err => {
			this.o.Server.setError('Projects', '_init', err)
		})
	}
	
	_getNames() {
		return new Promise(success => {
			let cmd = `find ${this.o.Server.files} -type d -maxdepth 1`
			this.o.Server.exec(cmd).then(stdin => {
				let dirs = stdin.toString().trim().split('\n')
				dirs.forEach(dir => {
					let {path, name} = this._pathSplit(dir)
					if ((/^.+\.git$/).test(name)) {
						let projectName = name.replace(/\.git$/, '')
						this.projects[projectName] = {}
						this.projects[projectName].gitPath = path + name
					}
				})
				success()
			})
		}).catch(err => {
			this.o.Server.setError('Projects', '_getNames', err)
		})
	}
	
	_getBares() {
		return new Promise(success => {
			let cmd = `find ${this.o.Server.files + 'bare'} -type d -maxdepth 1`
			this.o.Server.exec(cmd).then(stdin => {
				let dirs = stdin.toString().trim().split('\n')
				dirs.forEach(dir => {
					let {path, name} = this._pathSplit(dir)
					let projectName = name.replace(/_bare\.git/, '')
					if (this.projects[projectName]) {
						this.projects[projectName].barePath = path + name
					}
				})
				success()
			})
		}).catch(err => {
			this.o.Server.setError('Projects', '_getBares', err)
		})
	}
	
	_pathSplit(pathString) {
		let regExp = /^(.+\/)([^\/]+)$/
		let path = pathString.replace(regExp, '$1')
		let name = pathString.replace(regExp, '$2')
		return {path, name}
	}
}

module.exports = Projects