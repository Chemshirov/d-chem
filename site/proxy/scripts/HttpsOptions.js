const fs = require('fs')
const Settings = require('../../../_common/Settings.js')
const tls = require('tls')

class HttpsOptions {
	constructor() {
		this._lePath = '/usr/nodejs/le/'
		this._certs = this._getCertificates()
		let firstDomain = Object.keys(this._certs)[0]
		this._defaultCert = this._getCertificate(firstDomain)
	}
	
	get() {
		return this._getHttpsOptions()
	}
	
	getCurrentCertificate() {
		return this._getCertificate(process.env.DOMAIN)
	}
	
	_getHttpsOptions() {
		let options = {
			SNICallback: (domain, callback) => {
				let cert = this._certs[domain]
				if (!cert) {
					let fromSubDomain = null
					Settings.domains.some(ownDomain => {
						if (domain.includes('.' + ownDomain)) {
							fromSubDomain = ownDomain
							return true
						}
					})
					if (fromSubDomain) {
						cert = this._certs[fromSubDomain]
					}
				}
				
				let error = new Error(domain + ' is not here')
				
				if (callback) {
					if (cert) {
						callback(null, cert)
					} else {
						callback(error)
					}
				} else {
					if (cert) {
						return cert
					} else {
						return error
					}
				}
			},
			key: this._defaultCert.key,
			cert: this._defaultCert.cert,
		}
		return options
	}
	
	_getCertificates() {
		let domains = {}
		Settings.domains.forEach(domain => {
			let cert = this._getCertificate(domain, true)
			if (cert) {
				domains[domain] = cert
			}
		})
		return domains
	}
	
	_getCertificate(domain, doTls) {
		let cert = null
		let path = this._lePath + domain + '/'
		try {
			let certObject = {
				key: fs.readFileSync(path + 'privkey.pem', 'utf8'),
				cert: fs.readFileSync(path + 'fullchain.pem', 'utf8')
			}
			if (doTls) {
				cert = tls.createSecureContext(certObject)
			} else {
				cert = certObject
			}
		} catch(err) {}
		return cert
	}
}

module.exports = HttpsOptions