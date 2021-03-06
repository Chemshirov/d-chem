import * as tc from './types'
const { Server, Socket } = require('socket.io')
const Settings: tc.settings = require('../../stagePath/_common/Settings')

class WebsocketOnServer {
	private onError: tc.Starter['onError']
	private socketLabel: string
	private readonly label: string
	private server!: typeof Server
	private sockets!: typeof Server.sockets
	private onConnection?: (socket: typeof Socket) => void
	private onData?: (socket: typeof Socket, data: any) => void
	
	constructor(onError: tc.Starter['onError'], label: string) {
		this.onError = onError
		this.socketLabel = label
		this.label = this.constructor.name
	}
	
	public setSocket(): void {
		try {
			let port = Settings.nextJsWebsocketPortByStage(Settings.stage)
			type callback = (reason: string | null, allow?: boolean) => void
			this.server = new Server(port, {
				maxHttpBufferSize: Settings.socketMaxBufferSize,
				cors: {
					origin: (origin: string, callback: callback) => {
						if (this.corsOrigin(origin)) {
							callback(null, true)
						} else {
							callback(null)
						}
					},
					methods: ['GET', 'POST', 'OPTIONS'],
					credentials: true,
				}
			})
			this.sockets = this.server.sockets
			this.server.on('connection', (socket: typeof Socket) => {
				if (this.onConnection) {
					this.onConnection(socket)
				}
				socket.on(this.socketLabel, (data: any) => {
					if (this.onData && data) {
						this.onData(socket, data)
					}
				})
			})
		} catch (error) {
			this.onError(this.label, '_setSocket', error)
		}
	}
	
	corsOrigin(origin: string): string | void {
		if (origin) {
			let shortOrigin = origin.substring(0, 25)
			Settings.domains.some(siteName => {
				if (shortOrigin.includes(siteName)) {
					return origin
				}
			})
		}
	}
	
	public getUid(socket: typeof Socket): string {
		let uid: string = ''
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