const { loggerLimit } = require('../../../../_common/Settings.js')
import Settings from './Settings'

class MakeTree {
	logs: object
	errors: object
	data: object
	newLogs: object
	newErrors: object
	_trees: object
	constructor(logs: object, errors: object, data?: object) {
		this.logs = logs
		this.errors = errors
		this.data = data
	}
	
	public get() {
		this._reFresh()
		this._addToTree(this.logs)
		this._addToTree(this.errors) ////// if no errors at start then no new ones will be added
		return {
			logs: this.logs,
			errors: this.errors,
			tree: this._trees
		}
	}
	
	protected _reFresh() {
		this.logs = this._getFreshDataObject('logs', this.logs, this.data)
		this.errors = this._getFreshDataObject('errors', this.errors, this.data)
	}
	
	protected _addToTree(object) {
		if (!this._trees) {
			this._trees = {}
		}
		let dates = Object.keys(object)
		dates.forEach(date => {
			let log = object[date]
			let label = log.label || log.className
			let type = log.type
			this._treeInitiation(label, type)
			let data = log.data
			if (!log.data) {
				data = { method: log.method, error: log.error }
			}
			let dateObject = { label, type, data }
			this._trees[Settings.labelName][label][date] = dateObject
			this._trees[Settings.typesName][type][date] = dateObject
			this._trees[Settings.typesName][Settings.allName][date] = dateObject
		})
	}
	
	protected _treeInitiation(label, type) {
		if (!this._trees[Settings.labelName]) {
			this._trees[Settings.labelName] = {}
		}
		if (!this._trees[Settings.labelName][label]) {
			this._trees[Settings.labelName][label] = {}
		}
		if (!this._trees[Settings.typesName]) {
			this._trees[Settings.typesName] = {}
		}
		if (!this._trees[Settings.typesName][type]) {
			this._trees[Settings.typesName][type] = {}
		}
		if (!this._trees[Settings.typesName][Settings.allName]) {
			this._trees[Settings.typesName][Settings.allName] = {}
		}
	}
	
	protected _getFreshDataObject(type: string, logsOrErrors: object, data: object) {
		if (data && data[type]) {
			let dates = Object.keys(data[type])
			if (dates.length) {
				dates.forEach(date => {
					let newData = data[type][date]
					logsOrErrors[date] = newData
				})
				logsOrErrors = this._clearDataObject(logsOrErrors)
			}
		}
		return logsOrErrors
	}
	
	protected _clearDataObject(logsOrErrors) {
		let array = Object.keys(logsOrErrors)
		let overLimit = (array.length - loggerLimit)
		if (overLimit > loggerLimit / 10) {
			let toDelete = []
			let i = 0
			Object.keys(logsOrErrors).sort().some(date => {
				if (i < overLimit) {
					toDelete.push(date)
				} else {
					return true
				}
				i++
			})
			toDelete.forEach(date => {
				delete logsOrErrors[date]
			})
		}
		return logsOrErrors
	}
}

export default MakeTree