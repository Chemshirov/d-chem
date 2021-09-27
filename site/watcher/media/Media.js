const Films = require('./Films.js')

class Media {
	constructor(setupObject) {
		this.onError = setupObject.onError
		this.log = setupObject.log
		this.label = this.constructor.name
		
		new Films(setupObject)
	}
}

module.exports = Media