class Sockets {
	constructor(o) {
		this.o = o
		this.label = 'git'
		this._init()
	}
	
	_init() {
		this.io = require('socket.io')(917)
		this.io.on('connection', socket => {
			socket.on(this.label, object => {
				if (object) {
					this._func(socket, object)
					socket.emit(this.label, {ok: true})
				}
			})
		})
		this.io.adapter(
			require('socket.io-redis')({
				host: this.o.Server.ip,
				port: 6379
			})
		)
	}
	
	emit(data, socket) {
		// socket.emit doesn't work somehow
		this.io.emit(this.label, data)
	}
	
	_func(socket, data) {
		if (data.type === 'commit') {
			let ok = false
			if (data.id && this.o.Projects.projects[data.id]) {
				if (data.text && data.text.length > 3) {
					if (data.files && data.files.length) {
						console.log(data.id, data.type, data.files.length)
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
		} else if (['push', 'pushAnyway', 'pull', 'cli', 'cliShows', 'copyToProduction'].includes(data.type)) {
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