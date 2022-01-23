import * as tc from './types'
import * as io from 'socket.io-client'
const Settings: tc.settings = require('../../stagePath/_common/Settings')

export default class WebsocketOnClient {
	label: string
	socket: false | io.Socket
	onData?: (data: object) => void
	onConnected?: () => void
	onDisconnected?: () => void
	_checkServerSI?: NodeJS.Timeout
	documentIsHidden?: boolean
	documentIsHiddenDate?: number
	
	constructor(label: string, url?: string) {
		this.label = label
		this.socket = false
		this._setSocket(url)
		this._setAwaker()
	}
	
	public emit(data: object): void {
		if (this.socket && this.socket.connected) {
			this.socket.emit(this.label, data)
		}
	}
	
	private _setSocket(url?: string): void {
		if (typeof navigator !== 'undefined') {
			if (!(this.socket && this.socket.connected)) {
				if (this.socket) {
					this.socket.disconnect()
					this.socket = false
				}
				
				this.socket = (io as any)((url || undefined), {
					query: {
						label: this.label
					}
				})
				
				if (this.socket) {
					this.socket.on(this.label, (data: any) => {
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
		}
	}
	
	private _setAwaker(): void {
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
	
	private _onVisibilityChange(event: Event): void {
		if (event.target) {
			if (Reflect.has(event.target, 'hidden')) {
				let hidden = (event.target as HTMLInputElement).hidden
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