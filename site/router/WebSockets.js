const Settings = require('../../_common/Settings.js')
const socketIoClient = require('socket.io-client')

class Router {
	constructor(onError, credentials, oldHostName) {
		this._onError = onError
		this._credentials = credentials
		this._oldHostName = oldHostName
		
		this.label = this.constructor.name
		
		this._clientSockets = {}
	}
	
	start(websockets) {
		try {
			websockets.on('connection', this._wsRourtes.bind(this))
		} catch(err) {
			this._onError(this.label, 'start', err)
		}
	}
	
	_wsRourtes(socket) {
		socket.use(([event, ...args], next) => {
			this._socketHandle(socket, event, ...args)
			next()
		})
		socket.on('disconnect', (reason) => {
			if (this._clientSockets[socket.id] && this._clientSockets[socket.id].socket) {
				this._clientSockets[socket.id].socket.disconnect()
				delete this._clientSockets[socket.id]
			}
		})
		
	}
	
	async _socketHandle(clientSocket, event, ...args) {
		// console.log('get', clientSocket.id.substring(0, 5), event, JSON.stringify(...args).substring(0, 20))
		if (!this._clientSockets[clientSocket.id]) {
			this._clientSockets[clientSocket.id] = {queue: []}
			let object = this._clientSockets[clientSocket.id]
			object.queue.push({event, args: args})
			await this._setSocket(event, clientSocket.id, clientSocket.request.headers)
			
			this._setSocketEvent(clientSocket, event)
			for (let i = 0; i < object.queue.length; i++) {
				let queueUnit = object.queue.shift()
				let otherArgs = queueUnit.args
				if (object.socket) {
					object.socket.emit(queueUnit.event, ...otherArgs)
				}
			}
		} else {
			let object = this._clientSockets[clientSocket.id]
			if (object.socket) {
				this._setSocketEvent(clientSocket, event)
				object.socket.emit(event, ...args)
				this._updateTimeout(clientSocket.id)
			} else {
				object.queue.push({event, args})
			}
		}
	}
	
	_setSocket(label, clientSocketID, headers) {
		return new Promise(async success => {
			try {
				let object = this._clientSockets[clientSocketID]
				if (object && !object.socket) {
					let uid = ''
					let referer = ''
					if (headers && typeof(headers) === 'object') {
						uid = this._getUid(headers.cookie)
						referer = headers.referer
					}
					let {host} = this._getCredentials(label)
					// console.log(Date.now(), 'set', clientSocketID, host, uid, referer)
					let socket = await this._createSocket(host, uid, referer)
					object.socket = socket
					this._updateTimeout(clientSocketID)
				} else {
					this._updateTimeout(clientSocketID)
				}
				success(object.socket)
			} catch(err) {
				this._onError(this.label, '_setSocket catch', err)
			}
		}).catch(err => {
			this._onError(this.label, '_setSocket', err)
		})
	}
	
	_setSocketEvent(clientSocket, event) {
		let eventName = 'eventNameIs_' + event
		let nextSocket = this._clientSockets[clientSocket.id].socket
		if (nextSocket && !nextSocket[eventName]) {
			nextSocket[eventName] = true
			nextSocket.on(event, data => {
				// console.log('ans', clientSocket.id.substring(0, 6), event, JSON.stringify(data).substring(0, 20))
				clientSocket.emit(event, data)
			})
		}
	}
	
	_getCredentials(label) {
		let credentials = this._credentials[label]
		if (!credentials) {
			credentials = this._credentials[this._oldHostName]
		}
		return credentials
	}
	
	_updateTimeout(clientSocketID) {
		let socket = this._clientSockets[clientSocketID]
		if (socket && typeof socket === 'object') {
			if (this._clientSockets[clientSocketID].st) {
				clearTimeout(this._clientSockets[clientSocketID].st)
			}
			this._clientSockets[clientSocketID].st = setTimeout(() => {
				this._clearSocket(clientSocketID)
			}, Settings.socketExpires)
		}
	}
	
	_clearSocket(clientSocketID) {
		if (this._clientSockets[clientSocketID]) {
			delete this._clientSockets[clientSocketID]
		}
	}
	
	_createSocket(host, uid, referer) {
		return new Promise(success => {
			setTimeout(() => {
				if (success) {
					success()
				}
			}, Settings.socketAwait)
			
			let config = {
				autoConnect: true,
				extraHeaders: {uid, referer}
			}
			let socket = socketIoClient(host, config)
			socket.on('connect', () => {
				success(socket)
			})
		}).catch(err => {
			this._onError(this.label, '_setSocket', err)
		})
	}
	
	_getUid(cookie) {
		let regexp = new RegExp('^(.*)?' + Settings.mainLabel + '=([a-z0-9]+)(.*)?$')
		let uid = (cookie + '').replace(regexp, '$2')
		return uid
	}
	
	// _isInSharding(socketId) {
		// // Sharding isn't work because node cluster worker gets random socket every time
		// // and can't find right socket's handler (function) that established by another worker.
		// let amount = os.cpus().length
		// let charCodeStarts = 44
		// let charCodeEnds = 122
		// let variability = charCodeEnds - charCodeStarts
		// let current = (socketId + '').substring(0, 1)
		// let charCode = (socketId + '').charCodeAt(0) - charCodeStarts
		// let busyWorkerId = Math.ceil(charCode * amount / variability)
		// return (this.workerId === busyWorkerId)
	// }
}

module.exports = Router