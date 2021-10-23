const { Server, Socket } = require('socket.io')
const Settings = require('../../stagePath/_common/Settings')

class WebsocketOnServer {
	constructor(onError, label: string) {
		this.onError = onError
		this.socketLabel = label
	}
	
	setSocket() {
		try {
			let port = Settings.nextJsWebsocketPortByStage(process.env.STAGE)
			this.server = new Server(port)
			this.sockets = this.server.sockets
			this.server.on('connection', (socket: Socket) => {
				if (this.onConnection) {
					this.onConnection(socket)
				}
				socket.on(this.socketLabel, (data) => {
					if (this.onData && data) {
						this.onData(socket, data)
					}
				})
			})
		} catch (error) {
			this.onError(this.label, '_setSocket', error)
		}
	}
	
	getUid(socket) {
		let uid = ''
		try {
			let cookieMatch = (socket.handshake.headers.cookie + '').match(/chem=([a-z0-9]{32})/)
			if (cookieMatch) {
				uid = (cookieMatch[0] + '').replace('chem=', '')
			}
			if (socket.handshake.headers.uid) {
				uid = socket.handshake.headers.uid
			}
		} catch (e) {}
		return uid
	}
}

module.exports = WebsocketOnServer