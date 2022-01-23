const HttpsOptions = require('./HttpsOptions.js')
const SMTPServer = require("smtp-server").SMTPServer

class Smtp {
	constructor(onError, log, port) {
		this.onError = onError
		this.log = log
		this.label = this.constructor.name
		this._port = port
		this._start()
		// openssl s_client -starttls smtp -ign_eof -crlf -connect i8u4.com:465
		// 
		// EHLO i8u4.com
		// AUTH LOGIN
		// dG9t
		// cGFzc3dvcmQ=
		// MAIL FROM:<Konstantin@Chemshirov.ru>
		// RCPT TO:<test@i8u4.com>
		// DATA
		// Subject: Test message 03
		// This is a test 03.
		// .
		// QUIT
	}
	
	_start() {
		let options = {
			onAuth: this._onAuth.bind(this),
			onConnect: this._onConnect.bind(this),
			onMailFrom: this._onMailFrom.bind(this),
			onRcptTo: this._onRcptTo.bind(this),
			onData: this._onData.bind(this),
		}
		
		let certificate = new HttpsOptions().getCurrentCertificate()
			options.key = certificate.key
			options.cert = certificate.cert
			// options.authMethods = ['PLAIN', 'LOGIN', 'CRAM-MD5', 'XOAUTH2']
		
		let server = new SMTPServer(options)
		server.on('error', error => {
			console.log(this._port, error)
			this.onError(this.label, '_start ' + this._port, error)
		})
		server.listen(this._port)
		this.log('SMTP has started at port ' + this._port)
	}
	
	_onConnect(session, callback) {
		if (session.remoteAddress === '127.0.0.1') {
			return callback(new Error('This IP address is blacklisted'))
		} else {
			return callback()
		}
	}
	
	_onAuth(auth, session, callback) {
		console.log('session', session)
		console.log('onAuth', auth)
		if (auth.username !== 'tom' || auth.password !== 'password') {
			return callback(new Error('Authentication fails'))
		} else {
			callback(null, { user: auth.username })
		}
	}
	
	_onMailFrom(address, session, callback) {
		console.log('onMailFrom', address)
		if ((address.address + '').toLowerCase() !== 'konstantin@chemshirov.ru') {
			return callback(
				new Error('Wrong "from" address')
			)
		} else {
			return callback()
		}
	}
	
	_onRcptTo(address, session, callback) {
		console.log('onRcptTo', address)
		if ((address.address + '').toLowerCase() !== 'test@i8u4.com') {
			return callback(
				new Error('Wrong "to" address')
			)
		} else {
			return callback()
		}
	}
	
	_onData(stream, session, callback) {
		let chunks = []
		stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
		stream.on('end', () => {
			let string = Buffer.concat(chunks).toString('utf8')
			console.log(this._port, 'onData', string)
			callback()
		})
	}
}

module.exports = Smtp