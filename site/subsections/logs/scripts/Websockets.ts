import SocketIO from 'socket.io-client'
import Settings from './Settings'

export default class Websockets {
	label: string
	lastDate: string
	callback: (object) => {}
	socket: any
	documentIsHidden: boolean
	documentIsHiddenDate: number
	_checkServerSI: NodeJS.Timer
	_setSocketDate: number
	
	constructor(label: string, lastDate: string, callback: (object) => {}) {
		this.label = label
		this.lastDate = lastDate
		this.callback = callback
		this._setSocket()
		this._setAwaker()
	}
	
	public setLastDate(lastDate: string): void {
		if (lastDate) {
			this.lastDate = lastDate
		}
	}
	
	protected _setSocket(): void {
		if (typeof navigator !== 'undefined') {
			if (!(this.socket && this.socket.connected)) {
				if (this.socket) {
					this.socket.disconnect()
					this.socket = false
				}
				this.socket = SocketIO({
					query: {
						label: this.label
					}
				})
				this.socket.on(this.label, data => {
					if (data.news) {
						this.callback(data.news)
					}
				})
				this.socket.on('connect', () => {
					this._setConnectedColor(true)
					if (!this._setSocketDate) {
						this._setSocketDate = Date.now()
					}
					if (Date.now() - this._setSocketDate > Settings.socketReconnectTime) {
						this.getNews()
					}
				})
				this.socket.on('disconnect', () => {
					this._setConnectedColor(false)
				})
			}
			this.getNews()
		}
	}
	
	protected getNews(): void {
		if (this.socket && this.socket.connected) {
			this.socket.emit(this.label, { lastDate: this.lastDate })
		}
	}
	
	protected _setConnectedColor(isConnected: boolean): void {
		let headerElement = document.body.querySelector('.navbar-brand > h6')
		if (headerElement) {
			if (isConnected) {
				headerElement.classList.remove('alert-danger')
			} else {
				headerElement.classList.add('alert-danger')
			}
		}
	}
	
	protected _setAwaker(): void {
		if (typeof navigator !== 'undefined') {
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
	
	protected _onVisibilityChange(event): void {
		if (event.target) {
			if (Reflect.has(event.target, 'hidden')) {
				let hidden = event.target.hidden
				if (hidden) {
					this.documentIsHiddenDate = Date.now()
				} else {
					if (this.documentIsHiddenDate) {
						let hiddenTime = Date.now() - this.documentIsHiddenDate
						if (hiddenTime > Settings.socketReconnectTime) {
							this._setSocket()
						}
					}
				}
				this.documentIsHidden = hidden
			}
		}
	}
}