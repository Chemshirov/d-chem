const Mysql = require('./server/oldCode/Mysql.js')
const Servers = require('./server/Servers.js')
const Settings = require('../../../_common/Settings.js')
const Starter = require('../../../_common/Starter.js')

class Finance6 extends Starter {
	constructor(currentPath) {
		super()
		this.currentPath = currentPath
		this.label = this.constructor.name
	}
	
	async atStart() {
		try {
			await this.getDomainAndIps()
			this.servers = new Servers({
				onError: this.onError.bind(this),
				log: this.log,
				rabbitMQ: this.rabbitMQ,
				anotherIp: this.anotherIp,
				currentIp: this.currentIp
			})
			await this.rabbitMQ.receive(this._onReceive.bind(this))
			await this.servers.start([Settings.port])
		} catch(err) {
			this.onError(this.label, 'atStart', err)
		}
	}
	
	async _onReceive(object) {
		try {
			if (object.type === 'syncSql') {
				let masterIp = this.currentIp
				let slaveIp = this.anotherIp
				let isCurrentMaster = await this.isMaster()
				if (!isCurrentMaster) {
					masterIp = this.anotherIp
					slaveIp = this.currentIp
				}
				if (masterIp && slaveIp) {
					let mysql = new Mysql({ onError: this.onError.bind(this), masterIp, slaveIp })
					await mysql.sync()
					object.type = 'sqlSynced'
					this.rabbitMQ.send(object)
				}
			}
		} catch(error) {
			this.onError(this.label, '_onReceive', error)
		}
	}
}

module.exports = Finance6