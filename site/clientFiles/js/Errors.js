export default class Errors {
	constructor(label, logs, uid) {
		this.label = label
		this.logs = logs
		this.uid = uid
		this._init()
	}
	
	setSocket(socket) {
		this.socket = socket
	}
	
	set(error) {
		console.log('Error: ', error)
		if (error) {
			if (error.error) {
				error = error.error
			}
			if (error.stack) {
				error = error.stack
			}
			let cleanedError = JSON.parse(JSON.stringify(error))
			this._send({error: cleanedError})
		}
	}
	
	_init() {
		window.addEventListener('error', (msg, url, lineNo, columnNo, error) => {
			let notError01 = (msg && msg.message && msg.message === 'ResizeObserver loop limit exceeded')
			if (!notError01) {
				this.set(error || msg)
			}
		})
	}
	
	_send(object) {
		if (window.io && this.label) {
			let socket = window.io()
			object.log = this.logs.log
			object.uid = this.uid
			object.href = window.location.href
			console.log(object, socket)
			socket.on('connect', () => {
				socket.emit(this.label, object)
				setTimeout(() => {
					socket.removeAllListeners()
					socket.disconnect(true)
					socket.close()
				}, 2000)
			})
		}
	}
}