const Settings = require('../../../../_common/Settings.js')

class Html {
	constructor(commonObject) {
		this.o = commonObject
		this.mainHtml = ''
	}
	
	get() {
		if (!this.html) {
			this._get()
		}
		return this.html
	}
	
	renew() {
		return new Promise(success => {
			this.o.Projects.renew().then(() => {
				this._get()
			}).then(() => {
				success()
			})
		}).catch(err => {
			this.o.Server.setError('Html', 'renew', err)
		})
	}
	
	_get() {
		this._setHeader()
		this._setErrors()
		this._setMain()
		let html = `
			<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="utf-8">
					<title>Git</title>
					<link rel="stylesheet" type="text/css" href="/js/bootstrap431/css/bootstrap.min.css">
					<link rel="stylesheet" type="text/css" href="/git/main.css">
					<script async type="module" src="/git/Main.js"></script>
					<script src="/socket.io/socket.io.js"></script>
				</head>
				<body>
					${this.header}
					${this.errors}
					${this.mainHtml}
				</body>
			</html>
		`
		this.html = html.replace(/[\t\n]/g, '')
	}
	
	_setMain() {
		this.mainHtml = ``
		if (this.o.Projects && this.o.Projects.projects) {
			Object.keys(this.o.Projects.projects).forEach(name => {
				let Project = this.o.Projects.projects[name]['Project']
				this._setProject(Project)
			})
		}
	}
	
	_setProject(Project) {
		let serverPath = Project.workingDirectory || ''
		let setBranch = this._setBranch(Project)
		let ableToBePulled = this._setPullable(Project.ableToBePulled)
		let cliResult = this._setCliResult(Project.cliResult)
		let changedFiles = this._setChangedFiles(Project.changedFiles)
		let ableToBePushed = this._setPushable(Project)
		this.mainHtml += `
			<div id="${Project.name}" class="container-fluid project">
				<div class="d-flex align-items-baseline mt-4 mb-2 mr-2">
					<h4 class="mr-1 mb-0 text-nowrap">
						${Project.name}
					</h4>
					${setBranch}
					${this._showCliButtons()}
					${ableToBePulled}
				</div>
				<div class="d-flex-column ml-4 text-secondary">
					<div class="d-flex align-items-center">
						<span class="font-weight-light pr-2">
							CLI:
						</span>
						<div class="d-flex align-items-center input-group input-group-sm">
							<div class="input-group-prepend">
								<span class="input-group-text bg-transparent border-right-0">
									# git 
								</span>
							</div>
							<textarea id="cliTextarea" class="form-control d-inline-block border-left-0 pl-0" rows="1">
							</textarea>
							<div class="input-group-append">
								<button Cli class="btn btn-info px-3" type="button">
									Run
								</button>
							</div>
						</div>
					</div>
					${cliResult}
					<div>
						<span class="font-weight-light">Server path: </span>
						<span>${serverPath}</span>
					</div>
					<div>
						<span class="font-weight-light">Git: </span>
						<span>${Project.gitPath}</span>
					</div>
				</div>
				${changedFiles}
				${ableToBePushed}
			</div>
		`
	}
	
	_setBranch(Project) {
		let html = `
			<h4 class="alert alert-success m-0 p-1 pr-2 pb-2 font-weight-light">
				${Project.currentBranch}
			</h4>
		`
		if (Project.currentBranch === 'master') {
			if (Project.name === 'd-chem') {
				html += `
					<div class="d-flex position-relative ml-2">
						<button
							toProduction 
							class="btn btn-sm btn-outline-warning text-danger text-nowrap"
							type="button"
						>
							To production
						</button>
						<div class="position-absolute m-0 mt-1 p-0 dropdown dropdown-menu">
							<button copyToProduction class="btn btn-sm btn-danger w-100" type="button">
								I'm sure!
							</button>
						</div>
					</div>
				`
			}
		}
		return html
	}
	
	_setPullable(ableToBePulled) {
		let html = ''
		if (ableToBePulled) {
			html = `
				<div id="pull">
					<div class="dropdown">
						<button pullAble class="btn btn-outline-info dropdown-toggle" type="button">
							Pull is available
						</button>
						<div class="dropdown-menu mb-3">
							${this._pullInfo(ableToBePulled)}
							<div class="d-flex justify-content-center m-5">
								<button pull class="btn btn-info" type="button">
									Pull
								</button>
							</div>
						</div>
					</div>
				</div>
			`
		}
		return html
	}
	
	_showCliButtons() {
		let className = `btn btn-sm btn-outline-success mr-1`
		return `
			<div class="d-flex align-items-center pl-5 mx-2">
				<span class="font-weight-light mr-1">
					Show:
				</span>
				<button cliShows="branches" class="${className}" type="button">
					Branches
				</button>
				<button cliShows="graph" class="${className}" type="button">
					Graph
				</button>
				<button cliShows="usefull" class="${className}" type="button">
					Usefull
				</button>
			</div>
		`
	}
	
	_setCliResult(cliResult) {
		let html = ''
		if (cliResult && cliResult.value) {
			html = `
				<div class="ml-5">
					<div class="ml-2 font-weight-bold">
						${cliResult.value}
					</div>
					<div class="alert alert-info text-monospace">
						${cliResult.result.replace(/\n/g, '<br/>')}
					</div>
				</div>
			`
		}
		return html
	}
	
	_pullInfo(ableToBePulled) {
		let divider = `<div class="dropdown-divider"></div>`
		let html = ''
		ableToBePulled.forEach((string, i) => {
			let lineHtml =``
			let lineArray = string.split(/[\n]/)
			let changedI = lineArray.length
			let changedSign = false
			let conflict = false
			lineArray.forEach((line, j) => {
				let locationsRegExp = /^.*@@ \-([0-9,]+) \+([0-9,]+) @@.*$/
				let addClass = ``
				if (!j) {
					addClass += `bg-primary text-white pl-3 font-weight-bold`
				} else {
					if ((locationsRegExp).test(line)) {
						addClass += `mb-1`
						if (j !== 1) {
							addClass += ` mt-3`
						}
					}
					let minusRegExp = /^\-/
					if ((minusRegExp).test(line)) {
						addClass += `mx-3 my-0 py-0 rounded-0 `
						line = line.replace(minusRegExp, '&#8659; ')
						addClass += `pl-1 alert alert-danger `
						if (changedI + 1 === j) {
							if (changedSign !== minusRegExp + '') {
								addClass += ` font-weight-bold`
								conflict = true
							} else {
								addClass += ` border-top-0`
							}
						}
						changedI = j
						changedSign = minusRegExp + ''
					}
					let plusRegExp = /^\+/
					if ((plusRegExp).test(line)) {
						addClass += `mx-3 my-0 py-0 rounded-0 `
						line = line.replace(plusRegExp, '&#8657; ')
						addClass += `pl-1 alert alert-success`
						if (changedI + 1 === j) {
							if (changedSign !== plusRegExp + '') {
								addClass += ` font-weight-bold`
								conflict = true
							} else {
								addClass += ` border-top-0`
							}
						}
						changedI = j
						changedSign = plusRegExp + ''
					}
				}
				let htmlString = line.substring(0, 128)
					htmlString = htmlString.replace(/</g, '&lt;').replace(/>/g, '&gt;')
					if ((locationsRegExp).test(htmlString)) {
						let className = `alert py-0 mb-3 rounded-0`
						let coordinates = `
							<span class="${className} alert-danger">
								$1
							</span>
							<span class="${className} alert-success">
								$2
							</span>
						`
						htmlString = htmlString.replace(locationsRegExp, coordinates.replace(/[\t]/g, ''))
					}
					htmlString = htmlString.replace(/[\t]/g, `<span class="mr-4"></span>`)
				lineHtml += `<div class="${addClass}">${htmlString}</div>`
			})
			if (conflict) {
				if (i) {
					html += divider
				}
				html += `<div class="dropdown-item px-0">${lineHtml}</div>`
			}
		})
		if (html) {
			html += divider
		}
		return html
	}
	
	_setChangedFiles(files) {
		let html = ''
		if (files && files.length) {
			files.forEach(file => {
				html += `
					<div class="form-check">
						<input class="form-check-input" type="checkbox" checked>
						<label class="form-check-label">
							${file}
						</label>
					</div>
				`
			})
		}
		if (html) {
			html = `
				<div class="changedFiles">
					<h6 class="m-1">
						Changed file${(files.length == 1 ? '' : 's')}:
					</h6>
					<div class="form-check ml-2">
						${html}
					</div>
					<div class="form-inline w-100 pl-2">
						<div class="form-group w-50 pt-2">
							<textarea id="changedFilesTextarea" class="form-control w-100" rows="2"></textarea>
						</div>
						<button type="submit" changed class="btn btn-primary mx-5">Commit</button>
					</div>
				</div>
			`
		}
		return html
	}
	
	_setPushable(Project) {
		let ableToBePushed = Project.ableToBePushed
		let pullFirst = Project.pullFirst
		let html = ''
		if (ableToBePushed) {
			html = `
				<div class="push">
					<h6 class="mt-3">
						Unpushed commit${(ableToBePushed.length == 1 ? '' : 's')}:
					</h6>
					<div class="mx-3 my-1">
			`
			ableToBePushed.forEach(string => {
				html += `
						<div>
							${string}
						</div>
				`
			})
			html += `
					</div>
			`
			let className = `btn-danger`
			let disabled = ``
			if (pullFirst) {
				html += `
					<span class="px-3 text-danger font-weight-bold">
						Get pull before pushing
					</span>
					<button type="submit" pushAnyway class="px-3 btn btn-sm btn-danger">
						Push anyway
					</button>
				`
			} else {
				html += `
					<button type="submit" push class="ml-3 px-5 btn btn-sm btn-danger">
						Push
					</button>
				`
			}
			html += `
				</div>
			`
		}
		return html
	}
	
	_setHeader() {
		let readableDate = this._getDate(this.o.Main.startDate)
		this.header = `
			<div class="container-fluid text-right">
				<small class="text-muted">
					Git started at ${readableDate}
				</small>
			</div>
		`
	}
	
	_getDate(date) {
		let dateString = new Date(+date + 1000 * 60 * 60 * 3).toISOString()
			dateString = dateString.replace(/T/, ' ').replace(/Z/, '')
			dateString = dateString.replace(/\.[0-9]+$/, '')
		return dateString
	}
	
	_setErrors() {
		this.errors = ''
		let errorHtml = ''
		if (this.o.Main.errorObject) {
			Object.keys(this.o.Main.errorObject).forEach(date => {
				let object = this.o.Main.errorObject[date]
				errorHtml += `
					<div class="d-flex flex-column">
						<div class="d-flex">
							<div class="p-2 flex-fill">
								${this._getDate(date)}
							</div>
							<div class="p-2 flex-fill">
								${object.className}
							</div>
							<div class="p-2 flex-fill">
								${object.func}
							</div>
						</div>
						<div class="d-flex">
							${object.error.toString()}
						</div>
					</div>
				`
			})
			if (errorHtml) {
				this.errors = `
					<div class="container-fluid">
						<h4 class="pt-4">Errors</h4>
						<div class="container">
							${errorHtml}
						</div>
					</div>
				`
			}
		}
	}
	
	usefull() {
		let lsFile = 'ls-files --others \':!:*_old*\' \':!:*/.next/*\''
		let html = `
			<div class="d-flex flex-column align-items-start pl-5 mx-2">
				${this._usefullButton('Add file to tracking', 'add ', true)}
				${this._usefullButton('Get all untracked files', lsFile)}
				${this._usefullButton('Remove file from tracking', 'rm --cached ', true)}
			</div>
		`
		return html.replace(/[\r\n\t]/g, ' ')
	}
	
	_usefullButton(name, cliText, notExecute) {
		return `
			<button
				type="button"
				cliFiller="${cliText}"
				notExecute="${notExecute ? true : ''}"
				class="my-1 mx-2 btn btn-outline-info btn-sm"
			>
				${name}
			</button>
		`
	}
}

module.exports = Html