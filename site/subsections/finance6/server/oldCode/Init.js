const Mysql = require('./Mysql.js')

class Init {
	constructor(setupObject) {
		this.onError = setupObject.onError
		this.rabbitMQ = setupObject.rabbitMQ
		this.currentIp = setupObject.currentIp
		this.anotherIp = setupObject.anotherIp
		this.io = setupObject.websockets
		
		this.fs = require('fs')
		this.crypto = require('crypto')
		this.cheerio = require('cheerio')
		this.mysql = require('mysql')
		this.axios = require('axios')
		
		this.files = process.env.TILDA + process.env.AFTER_TILDA
		this.sda = '/usr/nodejs/sda/' + process.env.AFTER_TILDA
		this.common = require('./common.js')
		
		this.Arbiter = false
	}
	
	async init() {
		try {
			let Sql = new Mysql({
				onError: this.onError,
				currentIp: this.currentIp,
				anotherIp: this.anotherIp
			})
			
			let finance6 = {}
				finance6.errors = require('./errors.js')({
					common: this.common,
					fs: this.fs,
					files: this.files,
					sda: this.sda,
				})
				finance6.base = require('./base.js')({
					common: this.common,
					fs: this.fs,
					files: this.files,
					sda: this.sda,
					errors: finance6.errors,
					Sql
				})
				finance6.refreshClientsAfter = require('./refreshClientsAfterFileEdit.js')({
					common: this.common,
					fs: this.fs,
					files: this.files,
					errors: finance6.errors,
					io: this.io,
					base: finance6.base
				})
				finance6.file = require('./file.js')({
					common: this.common,
					fs: this.fs,
					files: this.files,
					crypto: this.crypto,
					base: finance6.base,
					errors: finance6.errors
				})
				finance6.getCurrencies = require('./getCurrencies.js')({
					common: this.common,
					fs: this.fs,
					files: this.files,
					sda: this.sda,
					axios: this.axios,
					cheerio: this.cheerio,
					io: this.io,
					base: finance6.base,
					error: finance6.errors
				})
				finance6.dataExchange = require('./dataExchange.js')({
					common: this.common,
					io: this.io,
					base: finance6.base,
					errors: finance6.errors
				})
				finance6.html = require('./html.js')({
					common: this.common,
					fs: this.fs,
					files: this.files,
					cheerio: this.cheerio,
					base: finance6.base,
					errors: finance6.errors
				})
				finance6.cache = require('./cache.js')({
					common: this.common
				})
				finance6.start = require('./start.js')({
					common: this.common,
					io: this.io,
					crypto: this.crypto,
					base: finance6.base,
					Sql,
					html: finance6.html,
					getCurrencies: finance6.getCurrencies,
					error: finance6.errors,
					anotherIp: this.anotherIp,
					rabbitMQ: this.rabbitMQ
				})
				finance6.sendToV5 = require('./sendToV5.js')({
					common: this.common,
					fs: this.fs,
					files: this.files,
					io: this.io,
					base: finance6.base,
					Sql,
					start: finance6.start,
					errors: finance6.errors,
					crypto: this.crypto
				})
				finance6.main = require('./main.js')({
					common: this.common,
					fs: this.fs,
					files: this.files,
					io: this.io,
					cheerio: this.cheerio,
					base: finance6.base,
					start: finance6.start,
					getCurrencies: finance6.getCurrencies,
					dataExchange: finance6.dataExchange,
					sendToV5: finance6.sendToV5,
					file: finance6.file,
					errors: finance6.errors,
					rabbitMQ: this.rabbitMQ
				})
				finance6.start.setSendNew(finance6.main.newDataHasAppeared.bind(finance6.main))
			return finance6
		} catch (err) {
			this.onError('Init', 'init', err)
		}
	}
}

module.exports = Init