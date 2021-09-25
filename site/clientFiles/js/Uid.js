import Settings from './Settings.js'

export default class Uid {
	constructor() {
		this._set()
	}
	
	get uid() {
		return this._uid
	}
	
	_set() {
		if (this._isUidWrong()) {
			this._uid = this._getCookie()
		}
		if (this._isUidWrong()) {
			let moscowDate = Date.now() + 3 * 60 * 60 * 1000
			let dateString = new Date(moscowDate).toJSON().replace(/[^0-9]/g, '')
			let randomTail = (Math.random() + '').replace(/^0\./, '')
			this._uid = (Settings.cookiePrefix + dateString + randomTail).substring(0, 32)
			let extraString = ';expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/; SameSite=None; Secure'
			document.cookie = Settings.cookiePrefix + '=' + this._uid + extraString
		}
	}
	
	_isUidWrong() {
		return (!this._uid || (this._uid + '').length != 32)
	}
	
	_getCookie() {
		let cookie = ''
		let name = Settings.cookiePrefix + '='
		let cookies = document.cookie.split(';')
		for (let i = 0; i < cookies.length; i++) {
			let c = cookies[i]
			while (c.charAt(0) == ' ') {
				c = c.substring(1)
			}
			if (c.indexOf(name) == 0) {
				cookie = c.substring(name.length, c.length)
			}
		}
		return cookie
	}
}