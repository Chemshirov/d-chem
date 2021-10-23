import * as io from 'socket.io-client'
const Settings = require('../../stagePath/_common/Settings')

interface settings {
	socketReconnectTime: number,
}

class WebsocketOnClient {
	label: string
	socket: boolean | io.Socket
	constructor(label: string) {
		this.label = label
		this.socket = false
		this._setSocket()
		this._setAwaker()
	}
	
	public emit(data) {
		if (this.socket && this.socket.connected) {
			this.socket.emit(this.label, data)
		}
	}
	
	protected _setSocket() {
		if (!(this.socket && this.socket.connected)) {
			if (this.socket) {
				this.socket.disconnect()
				this.socket = false
			}
			this.socket = io({
				query: {
					label: this.label
				}
			})
			this.socket.on(this.label, data => {
				if (data) {
					if (this.onData) {
						this.onData(data)
					}
				}
			})
			this.socket.on('connect', () => {
				if (this.onConnected) {
					this.onConnected()
				}
			})
			this.socket.on('disconnect', () => {
				if (this.onDisconnected) {
					this.onDisconnected()
				}
			})
		}
	}
	
	protected _setAwaker(): void {
		if (process.browser) {
			document.addEventListener('visibilitychange', this._onVisibilityChange.bind(this))
			if (this._checkServerSI) {
				clearInterval(this._checkServerSI)
			}
			this._checkServerSI = global.setInterval(() => {
				if (!this.documentIsHidden) {
					this._setSocket()
				}
			}, Settings.socketReconnectTime)
		}
	}
	
	protected _onVisibilityChange(event) {
		if (event.target) {
			if (Reflect.has(event.target, 'hidden')) {
				let hidden = event.target.hidden
				if (hidden) {
					this.documentIsHiddenDate = Date.now()
				} else {
					let hiddenTime = Date.now() - this.documentIsHiddenDate
					if (hiddenTime > Settings.socketReconnectTime) {
						this._setSocket()
					}
				}
				this.documentIsHidden = hidden
			}
		}
	}
}

module.exports = WebsocketOnClient