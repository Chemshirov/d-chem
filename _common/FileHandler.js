const fs = require('fs')
const Settings = require('./Settings')

class FileHandler {
	constructor(onError, fileString) {
		this.onError = onError
		this.fileString = fileString
		this.label = FileHandler.name
	}
	
	ifNotExistsCreateEmpty() {
		return new Promise(success => {
			fs.stat(this.fileString, (error, stat) => {
				if (error && error.code === 'ENOENT') {
					fs.writeFile(this.fileString, '', (error) => {
						if (!error) {
							this.setChown(success)
						} else {
							this.onError(this.label, 'ifNotExistsCreateEmpty writeFile', error)
						}
					})
				} else {
					success()
				}
			})
		}).catch(error => {
			this.onError(this.label, 'ifNotExistsCreateEmpty', error)
		})
	}
	
	objectToFileLater(object) {
		if (this._objectToFileLaterST) {
			clearTimeout(this._objectToFileLaterST)
		}
		this._objectToFileLaterST = setTimeout(() => {
			this.objectToFile(object)
		}, Settings.standardTimeout)
	}
	
	
	objectToFile(object) {
		return new Promise(success => {
			let string = JSON.stringify(object)
			this.stringToFile(string).then(done => {
				success(done)
			})
		}).catch(error => {
			this.onError(this.label, 'objectToFile catch', error)
		})
	}
	
	objectFromFile() {
		return new Promise(success => {
			fs.readFile(this.fileString, (error, data) => {
				if (!error) {
					try {
						let dataString = data.toString()
						let object = {}
						if (dataString) {
							object = JSON.parse(dataString)
						}
						success(object)
					} catch (error) {
						this.onError(this.label, 'objectFromFile JSON.parse', error)
					}
				} else {
					this.onError(this.label, 'objectFromFile readFile', error)
				}
			})
			setTimeout(() => {
				success(false)
			}, Settings.standardTimeout)
		}).catch(error => {
			this.onError(this.label, 'objectFromFile catch', error)
		})
	}
	
	stringToFile(string) {
		return new Promise(success => {
			if (this._lastString !== string) {
				this._lastString = string
				let tempFileString = this.fileString + '.' + Date.now() + '.temp'
				fs.writeFile(tempFileString, string, error => {
					if (!error) {
						fs.rename(tempFileString, this.fileString, error => {
							if (!error) {
								this.setChown(success, true)
							} else {
								this.onError(this.label, 'stringToFile rename', error)
							}
						})
					} else {
						this.onError(this.label, 'stringToFile writeFile', error)
					}
				})
			} else {
				success(false)
			}
		}).catch(error => {
			this.onError(this.label, 'stringToFile catch', error)
		})
	}
	
	setChown(callback, callbackValue) {
		return new Promise(success => {
			fs.chown(this.fileString, 1000, 1000, error => {
				if (!error) {
					if (callback) {
						callback(callbackValue)
					}
					success(callbackValue)
				} else {
					this.onError(this.label, 'setChown chown', error)
				}
			})
		}).catch(error => {
			this.onError(this.label, 'setChown catch', error)
		})
	}
	
	isExists() {
		return new Promise(success => {
			setTimeout(() => {
				success(false)
			}, Settings.standardTimeout)
			fs.stat(this.fileString, (error, stat) => {
				if (!error) {
					success(true)
				}
			})
		}).catch(error => {
			this.onError(this.label, 'isExists', error)
		})
	}
	
	copyTo(fileString) {
		return new Promise(success => {
			setTimeout(() => {
				success(false)
			}, Settings.standardTimeout)
			fs.copyFile(this.fileString, fileString, (error) => {
				if (!error) {
					this.setChown(success, true)
				}
			})
		}).catch(error => {
			this.onError(this.label, 'copyTo', error)
		})
	}
}

module.exports = FileHandler