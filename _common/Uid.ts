import * as tc from './types'
const Settings: tc.settings = require('../../stagePath/_common/Settings')

export default class Uid {
	private _uid: string
	
	constructor() {
		this._uid = ''
		this._set()
	}
	
	public get uid(): Uid['_uid'] {
		return this._uid
	}
	
	private _set(): void {
		if (typeof navigator !== 'undefined') {
			if (this._isUidWrong()) {
				this._uid = this._getCookie()
			}
			if (this._isUidWrong()) {
				let localDate = Date.now() + Settings.timeZone * 60 * 60 * 1000
				let dateString = new Date(localDate).toJSON().replace(/[^0-9]/g, '')
				let randomTail = (Math.random() + '').replace(/^0\./, '')
				this._uid = (Settings.mainLabel + dateString + randomTail).substring(0, 32)
				let extraString = ';expires=Fri, 31 Dec 9999 23:59:59 GMT;path=/;'
				document.cookie = Settings.mainLabel + '=' + this._uid + extraString
			}
		}
	}
	
	private _isUidWrong(): boolean {
		return (!this._uid || (this._uid + '').length != 32)
	}
	
	private _getCookie(): string {
		let cookie = ''
		let name = Settings.mainLabel + '='
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