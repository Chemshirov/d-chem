const ProjectClass = require('./Project.js')

class Projects {
	constructor(object) {
		this.o = object
		this.label = this.constructor.name
		this.files = this.o.Main.sda + process.env.STAGE + '/'
		this.projects = {}
	}
	
	start() {
		this.projects = {}
		return new Promise(async success => {
			await this._getNames()
			let array = Object.keys(this.projects)
			for (let i = 0; i < array.length; i++) {
				let name = array[i]
				let Project = new ProjectClass(this.o, name, this.projects[name])
				this.projects[name].Project = Project
				await Project.renew()
			}
			success()
		}).catch(err => {
			this.o.Main.setError(this.label, '_init', err)
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
			this.o.Main.setError(this.label, '_init', err)
		})
	}
	
	_getNames() {
		return new Promise(success => {
			let cmd = `find ${this.files} -type d -maxdepth 1`
			this.o.Main.exec(cmd).then(stdin => {
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
			this.o.Main.setError(this.label, '_getNames', err)
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