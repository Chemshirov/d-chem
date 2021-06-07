const Logins = require('/usr/nodejs/sda/' + process.env.STAGE + '/' + process.env.LABEL + '/Logins.js')

class Sql {
	constructor(object) {
		this.o = object
	}
	
	commit(mysqlString) {
		return this._mysqlConnection(mysqlString)
	}
	
	setModule(name, module) {
		this.o[name] = module
	}
	
	_mysqlConnection(mysqlString) {
		return new Promise(success => {
			let data = []
			this._query(this._getSettings('chatter'), mysqlString).then(dataObject => {
				data = dataObject
				if (!((/^[^a-z]*select/i).test(mysqlString))) {
					this._query(this._getSettings('loader'), mysqlString, data).then(() => {
						success(data)
					})
				} else {
					success(data)
				}
			})
		}).catch(err => {
			this.o.onError('Sql', '_mysqlConnection', err)
		})
	}
	
	_getSettings(name, ip) {
		return {
			host: ip || (name === 'chatter' ? this.o.Arbiter.chatterIp : this.o.Arbiter.loaderIp),
			port: (process.env.STAGE === 'development' ? 3307 : 3306),
			user: Logins.chemshirovSqlUser,
			password: Logins.chemshirovSqlPassword,
			database: 'chemshirov',
			dateStrings: true,
			multipleStatements: true
		}
	}
	
	_query(settings, mysqlString, dontWorry) {
		let connection = this.o.mysql.createConnection(settings)
		return new Promise(async success => {
			connection.connect(err => {
				if (err) {
					if (dontWorry) {
						success(dontWorry)
						connection.end()
					} else {
						this.o.onError('Sql', '_query connection.connect', err)
					}
				} else {
					connection.query(mysqlString, (err, data) => {
						if (err) {
							this.o.onError('Sql', '_query connection.query', err)
						}
						if (data && typeof data =='object') {
							success(data)
						}
						connection.end()
					})
				}
			})
		}).catch(err => {
			this.o.onError('Sql', '_query', err)
		})
	}
	
	sync() {
		this.masterSettings = this._getSettings(false, this.o.Arbiter.masterIp)
		this.slaveSettings = this._getSettings(false, this.o.Arbiter.slaveIp)
		return new Promise(async success => {
			let synced = await this._checkMd5()
			if (!synced) {
				await this._goSync()
			}
			success()
		}).catch(err => {
			this.o.onError('Sql', 'sync', err)
		})
	}
	
	_checkMd5() {
		let mysql = 'select group_concat(`from`) bothMd5 '
			mysql += 'from finance5 '
			mysql += 'where types = "md5" or types = "md5-2"'
		return new Promise(success => {
			this._query(this.masterSettings, mysql).then(data => {
				let masterBothMd5 = data[0]['bothMd5']
				this._query(this.slaveSettings, mysql).then(data => {
					let slaveBothMd5 = data[0]['bothMd5']
					success(masterBothMd5 === slaveBothMd5)
				})
			})
		}).catch(err => {
			this.o.onError('Sql', '_checkMd5', err)
		})
	}
	
	_goSync() {
		return new Promise(async success => {
			this.syncSqlStringArray = []
			await this._getSyncSqlStringArray()
			if (this.syncSqlStringArray.length) {
				await this._insertSyncSqlStringArray()
			}
			success()
		}).catch(err => {
			this.o.onError('Sql', '_goSync', err)
		})
	}
	
	_getSyncSqlStringArray() {
		return new Promise(success => {
			this._query(this.masterSettings, 'select * from `finance5`').then(data => {
				if (data) {
					let dataStrings = []
					data.forEach((e, i) => {
						let values = []
						Object.keys(e).forEach(c => {
							values.push("'" + (e[c] + '').replace(/'/g, "\\'") + "'")
						})
						dataStrings.push('    (' + values.join() + ')')
						if (i && !(i % 50)) {
							let tableNames = []
							Object.keys(e).forEach(c => {
								tableNames.push("`" + c + "`")
							})
							let sqlString = 'INSERT INTO `finance5` '
							sqlString += '    (' + tableNames.join() + ')'
							sqlString += 'VALUES '
							sqlString += dataStrings.join(',').replace(/'null',/g, 'NULL,') + ' '
							sqlString += 'ON DUPLICATE KEY UPDATE `types` = VALUES(`types`); '
							this.syncSqlStringArray.push(sqlString)
							dataStrings = []
						}
					})
				}
				success()
			})
		}).catch(err => {
			this.o.onError('Sql', '_goSync', err)
		})
	}
	
	_insertSyncSqlStringArray() {
		return new Promise(async success => {
			await this._query(this.slaveSettings, 'Truncate table `finance5`')
			for (let i = 0; i < this.syncSqlStringArray.length; i++) {
				let sql = this.syncSqlStringArray[i]
				await this._query(this.slaveSettings, sql)
			}
			let synced = await this._checkMd5()
			if (synced) {
				success()
			}
		}).catch(err => {
			this.o.onError('Sql', '_goSync', err)
		})
	}
}

module.exports = Sql