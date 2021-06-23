export default class SocketIO {
	constructor(Index) {
		this.Index = Index
		this.label = this.Index.label
		this.uid = this.Index.uid
		
		this.name = 'SocketIO'
		this.sockets = {}
		this._localStorageServersInfo()
	}
	
	set() {
		return new Promise(success => {
			this.Index.loaderScript(false, '/socket.io/socket.io.js', 'io').then(() => {
				this._socketInit()
				this._onSocketEstablishedCallback = success
			})
		}).catch(err => {
			throw err
		})
	}
	
	onReconnect(callback) {
		this._onReconnectCallback = callback
	}
	
	onRefreshEvent(callback) {
		this._onRefreshEventCallback = callback
	}
	
	onServerData(callback) {
		this._onServerDataCallback = callback
	}
	
	_socketInit() {
		return new Promise(success => {
			if (this.serversInfo) {
				if (this.serversInfo.chatterPath) {
					let connectToChatter = Promise.resolve()
					let original = this.sockets['origin']
					let chatterPath = this.serversInfo.chatterPath
					let loaderPath = this.serversInfo.loaderPath
					let originalEqualToChatter = (original && original.server === chatterPath)
					let originalEqualToLoader = (original && original.server === this.serversInfo.loaderPath)
					let itIsGoodChatter = (this.socket && this.socket.connected && this.socket.server === chatterPath)
					let loaderSocket = (this.sockets['loader'] || {})
					let itIsGoodLoader = (loaderSocket && loaderSocket.connected && loaderSocket.server === loaderPath)
					if (!original || !originalEqualToChatter) {
						if (!originalEqualToLoader) {
							this._clear('origin')
						}
						if (!itIsGoodChatter && !itIsGoodLoader) {
							connectToChatter = this._setSocket('chatter', this.serversInfo.chatterPath)
						}
					} else {
						this.sockets['chatter'] = original
					}
					connectToChatter.then(() => {
						this._onSocketEstablished()
						if (this.serversInfo.chatterPath !== this.serversInfo.loaderPath && !itIsGoodLoader) {
							return this._setSocket('loader', this.serversInfo.loaderPath)
						} else {
							return Promise.resolve()
						}
					}).then(() => {
						if (!this.sockets['loader'] && !this.sockets['chatter']) {
							return this._socketOrigin(success)
						} else {
							return Promise.resolve()
						}
					}).then(() => {
						success()
					}).catch(err => {
						throw err
					})
				} else {
					this._socketOrigin(success)
				}
			} else {
				this._socketOrigin(success)
			}
		}).then(() => {
			this._reconnectHasHappened()
		}).catch(err => {
			throw err
		})
	}
	
	_socketOrigin(success) {
		return this._setSocket('origin', window.location.origin).then(() => {
			if (success) {
				success()
			}
		})
	}
	
	_clear(name) {
		if (this.sockets[name]) {
			this.sockets[name].removeAllListeners()
			this.sockets[name].disconnect(true)
			this.sockets[name].close()
			delete this.sockets[name]
		}
	}
	
	_setSocket(name, path, ok) {
		return new Promise(success => {
			if (this.sockets && this.sockets[name]) {
				this.sockets[name].close()
			}
			let config = {
				autoConnect: true,
				withCredentials: true,
				extraHeaders: {
					uid: this.uid
				}
			}
			if (window.io) {
				let socket = window.io(path, config)
				socket.server = path
				socket.open()
				socket.on(this.label, data => {
					if (data) {
						this._socketFunction(data, success, name, socket.id)
					}
				})
				socket.on('connect', () => {
					this.sockets[name] = socket
					this.sockets['current'] = socket
					if (!this.serversInfo || !this._firstSocketHasConnected) {
						this._firstSocketHasConnected = true
						socket.emit(this.label, {t: 'getServerInfo'})
					} else {
						success()
						if (ok) {
							ok()
						}
					}
				})
				setTimeout(() => {
					let notGood = `itNeedsToBeRewritenWithoutTimeout`
					if (success) {
						success()
					}
				}, 1000)
			} else {
				setTimeout(() => {
					return this._setSocket(name, path, success)
				}, 100)
			}
		}).catch(e => {
			throw e
		})
	}
	
	_onSocketEstablished() {
		this.socket = this.sockets['chatter'] || this.sockets['current']
		if (!this.socket) {
			this.serversInfo = {}
			this._socketInit()
		} else {
			if (this._onSocketEstablishedCallback) {
				this._onSocketEstablishedCallback()
				this._onSocketEstablishedCallback = false
			}
		}
	}
	
	_socketFunction(data, success, name, socketId) {
		if (data['serversInfo']) {
			this._setServersInfo(data['serversInfo'])
			if (success) {
				success()
			}
			if (name === 'origin' || this._firstSocketHasConnected) {
				if (this._socketIniST) {
					clearTimeout(this._socketIniST)
				}
				this._socketIniST = setTimeout(() => {
					this._socketInit(this._firstSocketHasConnected)
				}, 1000)
			}
		} else if (data.t === 'refresh') {
			this._onRefreshEvent(data.date)
		} else {
			this._onServerData(data, name)
		}
	}
	
	_setServersInfo(serversInfo) {
		let loaderHost = window.location.hostname
		let chatterHost = loaderHost
		if (serversInfo) {
			let postfix = 'host'
			if (serversInfo.loader.connected) {
				loaderHost = serversInfo.loader[postfix]
			} else {
				if (serversInfo.chatter.connected) {
					serversInfo.chatter.both = true
					loaderHost = serversInfo.chatter[postfix]
				}
			}
			
			if (serversInfo.chatter.connected) {
				chatterHost = serversInfo.chatter[postfix]
			} else {
				if (serversInfo.loader.connected) {
					serversInfo.loader.both = true
					chatterHost = serversInfo.loader[postfix]
				}
			}
			
			let portString = ''
			if (window.location.port) {
				portString = ':' + window.location.port
			}
			let loaderPath = window.location.protocol + '//' + loaderHost + portString
			let chatterPath = window.location.protocol + '//' + chatterHost + portString
			let altPath = chatterPath
			if (loaderPath === altPath) {
				altPath = window.location.origin
			}
			
			serversInfo.loaderPath = loaderPath
			serversInfo.chatterPath = chatterPath
			serversInfo.altPath = altPath
			
			this.serversInfo = serversInfo
			this._localStorageServersInfo(serversInfo)
			this._updateServerInfo()
		}
	}
	
	_updateServerInfo() {
		if (this._updateServerInfoST) {
			clearTimeout(this._updateServerInfoST)
		}
		if (this._incompleteServerPair()) {
			this._updateServerInfoST = setTimeout(() => {
				if (this._incompleteServerPair() && this.socket) {
					this.socket.emit(this.label, {t: 'getServerInfo'})
				}
			}, 1000 * 30)
		}
	}
	
	_incompleteServerPair() {
		let if01 = !this.serversInfo.chatter.connected
		let if02 = !this.serversInfo.loader.connected
		let if03 = !this.serversInfo.chatter.internetUpTime
		let if04 = !this.serversInfo.loader.internetUpTime
		if (if01 || if02 || if03 || if04) {
			return true
		}
	}
	
	_localStorageServersInfo(info) {
		let localStorage = window.localStorage
		if (localStorage) {
			let data = {}
			let lSdata = localStorage.getItem(this.name)
			if (lSdata) {
				data = JSON.parse(lSdata)
			}
			
			if (!info) {
				if (data && data.serversInfo) {
					data.serversInfo.chatter.connected = true
					data.serversInfo.loader.connected = true
					this.serversInfo = data.serversInfo
					this._setServersInfo(this.serversInfo)
				}
			} else {
				data.serversInfo = info
				localStorage.setItem(this.name, JSON.stringify(data))
			}
		}
	}
	
	_reconnectHasHappened() {
		if (this._onReconnectCallback) {
			this._onReconnectCallback({
				socket: this.socket,
				serversInfo: this.serversInfo
			})
		}
	}
	
	_onRefreshEvent(date) {
		if (this._onRefreshEventCallback) {
			this._onRefreshEventCallback(date)
		}
	}
	
	_onServerData(data, name) {
		if (this._onServerDataCallback) {
			data.serverName = name
			this._onServerDataCallback(data)
		}
	}
}