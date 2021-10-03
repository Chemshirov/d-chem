class NextHandler {
	constructor(onError, log) {
		this.onError = onError
		this.log = log
		this.label = this.constructor.name
	}
	
}

module.exports = NextHandler