class Sockets {
	constructor(onError, commonObject, websockets) {
		this.onError = onError
		this.o = commonObject
		this._websockets = websockets
		
		this.label = this.constructor.name
		this.socketLabel = 'git'
		
		this._init()
	}
	
	_init() {
		this._websockets.on('connection', socket => {
			socket.on(this.socketLabel, object => {
				if (object) {
					this._func(socket, object)
				}
			})
		})
	}
	
	emit(data, socket) {
		this._websockets.emit(this.socketLabel, data)
	}
	
	_func(socket, data) {
		let types = ['push', 'pushAnyway', 'pull', 'cli', 'cliShows', 'copyToProduction']
		if (data.type === 'commit') {
			let ok = false
			if (data.id && this.o.Projects.projects[data.id]) {
				if (data.text && data.text.length > 3) {
					if (data.files && data.files.length) {
						ok = true
					}
				}
			}
			if (!ok) {
				this.emit({reload: true}, socket)
			} else {
				this.o.Projects.projects[data.id].Project.commit(data).then(async () => {
					await this.o.Html.renew()
					this.emit({reload: true}, socket)
				})
			}
		} else if (types.includes(data.type)) {
			let project = this.o.Projects.projects[data.id]
			if (project) {
				project.Project[data.type](data.value).then(async () => {
					await this.o.Html.renew()
					this.emit({reload: true}, socket)
				})
			}
		}
	}
}

module.exports = Sockets