const Redis = require('../../../_common/Redis.js')
const Settings = require('../../../_common/Settings.js')
const socketIO = require('socket.io')

class Websockets {
	constructor(onError, socketLabel) {
		this.onError = onError
		this.socketLabel = socketLabel
		this.label = this.constructor.name
		this.redisLabel = 'Logger'
	}
	
	async start() {
		try {
			this._setSocket()
			await this._subscribe()
		} catch (error) {
			this.onError(this.label, 'start', error)
		}
	}
	
	_socketOnMessage(socket, message) {
		if (message && message.lastDate) {
			if (this._lastDate !== message.lastDate) {
				this._sendNews(socket)
			}
		}
	}
	
	// _isTooOften(lastDate) {
		// if (this._lastDate) {
			// let currentUnixLastDate = new Date(this._lastDate).getTime()
			// let anotherUnixLastDate = new Date(lastDate).getTime()
			// let gap = Math.abs(anotherUnixLastDate - currentUnixLastDate)
			// if (gap < Settings.socketAwait) {
				// return true
			// }
		// }
	// }
	
	async _sendNews(socket) {
		try {
			let news = await this._getRedisNews()
			if (news.ok) {
				if (socket) {
					socket.emit(this.socketLabel, { news })
				} else {
					this.webSocketIo.sockets.emit(this.socketLabel, { news })
				}
			}
		} catch (error) {
			this.onError(this.label, '_sendNews', error)
		}
	}
	
	async _subscribe() {
		try {
			let redis = new Redis(this.onError)
			let callback = this._redisOnMessage.bind(this)
			await redis.subscribe(this.redisLabel, callback)
		} catch (error) {
			this.onError(this.label, '_subscribe', error)
		}
	}
	
	async _redisOnMessage(message) {
		try {
			this._sendNews()
		} catch (error) {
			this.onError(this.label, '_redisOnMessage', error)
		}
	}
	
	async _getRedisNews() {
		try {
			let result = {}
			this._newMaxDate = '0'
			if (!this.redis) {
				this.redis = new Redis(this.onError)
			}
			let types = await this.redis.smembers(this.redisLabel + ':types')
			if (typeof types === 'object') {
				for (let i = 0; i < types.length; i++) {
					let type = types[i]
					let dataObject = await this._getRedisDataObject(type)
					result[type] = dataObject
					result.ok = true
				}
			}
			result.maxDate = this._newMaxDate
			this._lastDate = this._newMaxDate
			return result
		} catch (error) {
			this.onError(this.label, '_getRedisNews', error)
		}
	}
	async _getRedisDataObject(type) {
		try {
			let newData = {}
			let dates = await this.redis.lrange(this.redisLabel + ':' + type + ':list', 0, -1)
			if (typeof dates === 'object') {
				let newDates = []
				for (let i = 0; i < dates.length; i++) {
					let date = dates[i]
					if (date <= this._lastDate) {
						break
					} else {
						newDates.push(date)
					}
				}
				if (newDates.length) {
					for (let i = 0; i < newDates.length; i++) {
						let date = newDates[i]
						if (date > this._newMaxDate) {
							this._newMaxDate = date
						}
						let data = await this._getRedisData(type, date)
						if (data) {
							newData[date] = data
						}
					}
				}
			}
			return newData
		} catch (error) {
			this.onError(this.label, '_getRedisDataObject', error)
		}
	}
	async _getRedisData(type, date) {
		try {
			let data = await this.redis.hget(this.redisLabel + ':' + type, date)
			if (typeof data === 'string') {
				try {
					data = JSON.parse(data)
				} catch(err) {}
			}
			return data
		} catch (error) {
			this.onError(this.label, '_getRedisData', error)
		}
	}
	
	_setSocket() {
		try {
			let options = {}
			let port = Settings.nextJsWebsocketPortByStage(process.env.STAGE)
			this.webSocketIo = socketIO(port)
			this.webSocketIo.on('connection', socket => {
				socket.on(this.socketLabel, data => {
					this._socketOnMessage(socket, data)
				})
			})
		} catch (error) {
			this.onError(this.label, '_setSocket', error)
		}
	}
}

module.exports = Websockets