const FilesWatcher = require('../../../../_common/FilesWatcher.js')

class Watcher {
	constructor(o) {
		this.o = o
	}
	
	start() {
		let filesWatcher = new FilesWatcher(this.o.Main.setError.bind(this))
		filesWatcher.onFileChanged(this._onFileChanged.bind(this))
		filesWatcher.addStringToIgnore('_tempFiles', true)
		filesWatcher.addStringToIgnore('_webpack')
		filesWatcher.addStringToIgnore('.temp')
		
		Object.keys(this.o.Projects.projects).forEach(name => {
			let path = this.o.Projects.projects[name].Project.workingDirectory
			filesWatcher.watchPath(path)
		})
	}
	
	_onFileChanged(directory, fileName) {
		console.log('_onFileChanged', directory, fileName)
		if ((/\/www/).test(directory)) {
			this.o.Main.sendReload(false)
		} else {
			this.o.Main.sendReload(true)
		}
	}
}

module.exports = Watcher