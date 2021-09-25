const child_process = require('child_process')
const fs = require('fs')

class Converter {
	constructor(onError, log, filePath) {
		this.onError = onError
		this.log = log
		this.filePath = filePath
		this.label = this.constructor.name
	}
	
	toH264() {
		return new Promise(async success => {
			try {
				this.mp4 = this.filePath.replace(/^(.+)\.[^\/]+$/, '$1.mp4')
				this.mp4Temp = this.filePath.replace(/^(.+)\.[^\/]+$/, '$1.temp')
				if (this.filePath !== this.mp4) {
					try {
						let deleteIfExitsTemp = fs.unlink(this.mp4Temp, () => {})
					} catch (e) {}
					await this._getInfo(this.filePath)
					
					let fileOld = `'${this.filePath}'`
					let mp4Temp = `'${this.mp4Temp}'`
					if ((/'/).test(this.filePath)) {
						fileOld = `"${this.filePath}"`
						mp4Temp = `"${this.mp4Temp}"`
					}
					
					let videoSpecs = `-vcodec libx264 -b:v 1500k -maxrate 3M -bufsize 1M -vf "scale=-1:'min(ih,720)'"`
					let audioSpecs = `-acodec libmp3lame -ar 48000 -q:a 0 -ac 2`
					if (this.fileInfo.audioCodec == 'mp3') {
						audioSpecs = `-acodec copy`
					}
					
					let cmd = `ffmpeg -i ${fileOld} ${videoSpecs} ${audioSpecs} -f mp4 ${mp4Temp}`
					this.log(this.label, cmd)
					child_process.exec(cmd, {maxBuffer: 1024 * 1000 * 10}, async (error, stdin, stdout) => {
						let fileInfo = false
						try {
							if (error) {
								this.onError(this.label, 'toH264 child_process.exec', error)
								fs.rename(this.filePath, this.filePath + '.error', () => {})
							} else {
								fs.chownSync(this.mp4Temp, 1000, 1000)
								let deleteIfExits = fs.unlink(this.mp4, () => {})
								fs.rename(this.mp4Temp, this.mp4, () => {})
								await this._getInfo(this.mp4)
								fileInfo = this.fileInfo
							}
							try {
								let deleteIfExits = fs.unlink(this.filePath, () => {})
								let deleteIfExitsTemp = fs.unlink(this.mp4Temp, () => {})
							} catch (e) {}
							if (fileInfo) {
								fileInfo.filePath = this.mp4
							}
						} catch (error) {
							this.onError(this.label, 'toH264 child_process catch', error)
						}
						success(fileInfo)
					})
				} else {
					success()
				}
			} catch (error) {
				this.onError(this.label, 'toH264 catch', error)
				success()
			}
		}).catch(error => {
			this.onError(this.label, 'toH264', error)
		})
	}
	
	_getInfo(filePath) {
		return new Promise(success => {
			if (!filePath) {
				filePath = this.filePath
			}
			let cmd = `ffmpeg -i '${this.filePath}'`
			if ((/'/).test(this.filePath)) {
				cmd = `ffmpeg -i "${this.filePath}"`
			}
			child_process.exec(cmd, (error, stdin, stdout) => {
				if (error) {
					let isHasToBeAnError = 'itIsOkForFfmpeg'
				}
				this._getInfoByFfmpegStdout(stdout)
				success()
			})
		}).catch(error => {
			this.onError(this.label, '_getInfo', error)
		})
	}
	
	_getInfoByFfmpegStdout(stdout) {
		let result = stdout.toString().replace(/[\r\n]/g, '__newLine__')
		let duration = result.replace(/^.+Duration: ([0-9]+:[0-9]{2}:[0-9]{2}\.[0-9]+),.+$/, '$1')
		if (duration) {
			this.fileInfo = { duration }
			let hour = +duration.replace(/([0-9]+):([0-9]{2}):([0-9]{2})\.([0-9]+)/, '$1')
			if (hour) {
				this.fileInfo.hour = hour
				let min = +duration.replace(/([0-9]+):([0-9]{2}):([0-9]{2})\.([0-9]+)/, '$2')
				this.fileInfo.min = min
				let sec = +duration.replace(/([0-9]+):([0-9]{2}):([0-9]{2})\.([0-9]+)/, '$3')
				this.fileInfo.sec = sec
				let cent = +duration.replace(/([0-9]+):([0-9]{2}):([0-9]{2})\.([0-9]+)/, '$4')
				this.fileInfo.milli = cent / 100
				this.fileInfo.totalSeconds = +Math.round(hour * 60 * 60 + min * 60 + sec * 1) + cent / 100
			} else {
				delete this.fileInfo.duration
			}
			
			let videoString = result.replace(/^.+Stream[^,]+Video: (.+)__newLine__.+$/, '$1')
			let videoStringArray = videoString.split(',')
			this.fileInfo.videoCodec = videoStringArray[0].replace(/^([^ ]+).+$/, '$1').trim()
			let widthXheight = videoString.replace(/^.*[^0-9]([0-9]{3,8}x[0-9]{3,8})[^0-9]*.*$/g, '$1')
			let width = +widthXheight.replace(/^([0-9]+)x([0-9]+)$/, '$1')
			this.fileInfo.width = width
			if (width) {
				let height = +widthXheight.replace(/^([0-9]+)x([0-9]+)$/, '$2')
				this.fileInfo.height = height
				this.fileInfo.aspect = width / height
				let videoBitRate = +(videoStringArray[3] || '').replace(/[^0-9]/g, '')
				if (videoBitRate > 100) {
					this.fileInfo.videoBitRate = videoBitRate
				}
			} else {
				delete this.fileInfo.width
			}
 			
			let isSubtitles = (/^.+Stream[^,]+eng[^,]+Subtitle: .+$/).test(result)
			this.fileInfo.isSubtitles = isSubtitles
			
			
			let audioString = result.replace(/^.+Stream[^,]+Audio: (.+)__newLine__.+$/, '$1')
			let audioStringArray = audioString.split(',')
			this.fileInfo.audioCodec = audioStringArray[0].replace(/^([^ ]+).*$/, '$1')
			this.fileInfo.audioSamplingRate = +(audioStringArray[1] || '').replace(/[^0-9]/g, '')
			if (audioStringArray[2]) {
				this.fileInfo.audioChannels = audioStringArray[2].trim()
			}
			if (audioStringArray[4]) {
				this.fileInfo.audioBitRate = +audioStringArray[4].replace(/[^0-9]/g, '')
			}
		}
	}
}

module.exports = Converter