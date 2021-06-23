const Mysql = require('./server/oldCode/Mysql.js')
const Redis = require('../../../_common/Redis.js')
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
			this.servers = new Servers(this.onError.bind(this), this.currentPath, this.rabbitMQ)
			await this.servers.start([Settings.port])
		} catch(err) {
			this.onError(this.label, 'atStart', err)
		}
	}
	
	async onRabbitMqReceives(object, onDone) {
		try {
			if (object.type === 'syncSql') {
					let redis = new Redis(this.onError)
					this.currentRedis = await redis.connect()
					let label = 'Arbiter'
					let masterIp = await this.currentRedis.hget(label, 'masterIp')
					let slaveIp = await this.currentRedis.hget(label, 'slaveIp')
					if (masterIp && slaveIp) {
						let mysql = new Mysql({ onError: this.onError, masterIp, slaveIp })
						await mysql.sync()
						onDone(true)
					} else {
						onDone('fail')
					}
			} else
			if (object.type === 'new user') {
				this.servers.finance6.main.masterToSlave(object)
				onDone(true)
			}
		} catch(err) {
			this.onError(this.label, 'onRabbitMqReceives', err)
		}
	}
}

module.exports = Finance6