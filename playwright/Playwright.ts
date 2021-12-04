import * as tc from '../_common/types'
const childProcess = require('child_process')
const fs = require('fs')
const FileHandler: tc.FileHandler = require('../stagePath/_common/FileHandler')
const FilesWatcher: tc.FilesWatcher = require('../stagePath/_common/FilesWatcher')
const Settings: tc.settings = require('../stagePath/_common/Settings')
const Starter: tc.Starter = require('../stagePath/_common/Starter')

class Playwright extends Starter {
	private currentPath: string
	private readonly label: string
	private readonly sKey: string
	private _oneByOneBusy: boolean
	private _testHasFailed: boolean
	
	constructor(currentPath: string) {
		super()
		this.currentPath = currentPath
		this.label = this.constructor.name
		this.sKey = this.label + 'toTest'
		this._oneByOneBusy = false
		this._testHasFailed = false
	}
	
	private async atStart(): Promise<void> {
		try {
			await this.getDomainAndIps()
			await this.rabbitMQ.receive(this._onReceive.bind(this))
			this._oneByOne()
		} catch (error: unknown) {
			this.onError(this.label, 'atStart', error)
		}
	}
	
	private async _onReceive(object: tc.keyValue<string>): Promise<void> {
		try {
			if (object) {
				if (object.toTest) {
					await this.redis.sadd(this.sKey, object.toTest)
					this._oneByOne()
				} else if (object.pathToTests) {
					let filesWatcher = new FilesWatcher(this.onError)
					let files = await filesWatcher.getList(object.pathToTests)
					for (let i = 0; i < files.length; i++) {
						let fileString = files[i]
						await this.redis.sadd(this.sKey, fileString)
					}
					this._oneByOne()
				} else if (object.takeScreenshot) {
					this._takeScreenshot(object.url, object.path)
				}
			}
		} catch (error) {
			this.onError(this.label, '_onReceive', error)
		}
	}
	
	private async _oneByOne(): Promise<void> {
		try {
			if (!this._oneByOneBusy) {
				this._oneByOneBusy = true
				let toTest = await this.redis.srandmember(this.sKey)
				if (toTest) {
					this._testHasFailed = true
					let cmd = 'xvfb-run playwright test --reporter=json ' + toTest
					await this._spawn(cmd)
					if (!this._testHasFailed) {
						this.log('Tests have passed', toTest)
					}
					await this.redis.srem(this.sKey, toTest)
					this._oneByOneBusy = false
					await this._oneByOne()
				} else {
					this._oneByOneBusy = false
				}
			} else {
				setTimeout(() => {
					this._oneByOneBusy = false
				}, Settings.standardTimeout * 15)
			}
		} catch(error) {
			this.onError(this.label, '_oneByOne', error)
		}
	}
	
	_spawn(cmd: string) {
		return new Promise(success => {
			let newProcess = childProcess.spawn(cmd, {shell: '/bin/bash'})
			newProcess.stdout.on('data', (data: Buffer) => {
				if (!cmd.startsWith('npx playwright screenshot')) {
					this._onResult(data)
				}
			})
			newProcess.stderr.on('data', (error: Buffer) => {
				let errorString = this._bufferToString(error)
				if (!errorString.includes('ERR_CONNECTION_REFUSED')) {
					this.onError(this.label, '_spawn stderr', errorString.substring(0, 512))
				}
			})
			newProcess.on('close', () => {
				success(true)
			})
		}).catch(error => {
			this.onError(this.label, '_spawn', error)
		})
	}
	
	
	_bufferToString(buffer: Buffer): string {
		return buffer.toString().replace(/[^\u0020-\u0256]/g,'').trim()
	}
	
	_onResult(data: Buffer): void {
		try {
			let infoString = this._bufferToString(data)
			if (infoString.length > 1) {
				let object = JSON.parse(infoString)
				let specs = object.suites[0].specs
				if (object.suites[0].suites && object.suites[0].suites[0].specs) {
					specs = specs.concat(object.suites[0].suites[0].specs)
				}
				let ok = true
				specs.some((result: any) => {
					if (!result.ok) {
						ok = false
						let error = result.tests[0].results[0].error
						this.onError(this.label, '_onResult', error)
						return true
					} else {
						if (result.tests && result.tests[0].results && result.tests[0].results[0].stdout) {
							result.tests[0].results[0].stdout.forEach((textObject: {text: string}) => {
								if (textObject && textObject.text) {
									this.log(textObject.text)
								}
							})
						}
					}
				})
				if (ok) {
					this._testHasFailed = false
				}
			}
		} catch (error) {
			this.onError(this.label, '_onResult catched', this._bufferToString(data))
		}
	}
	
	private async _takeScreenshot(url: string, path: string): Promise<void> {
		let cmd = `npx playwright screenshot --viewport-size="1920, 1080" --wait-for-timeout 3000 ${url} ${path}`
		await this._spawn(cmd)
	}
}

module.exports = Playwright