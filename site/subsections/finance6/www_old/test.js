class Test {
	static show(a) {
		window.showO('Test: ' + a)
	}
	
	static showButton() {
		if (window.location.port == '81') {
			Test.showColor()
			let button = Test.getButton()
			let body = document.querySelector('body')
			if(body){
				let alreadyExist = document.querySelector('#load2release')
				if (alreadyExist)	alreadyExist.remove()
				document.body.insertAdjacentHTML('afterbegin', button)
			}
			Test.setListener()
		}
	}
	
	static showColor() {
		let divButtons = document.querySelector('#buttons')
		if (divButtons) {
			divButtons.setAttribute('class', 'dev')
		}
	}
	
	static getButton() {
		let button = ''
			button += '<button id="load2release" type="button" class="btn btn-danger btn-sm">'
			button += 	Test.buttonTitle
			button += '</button>'
		return button
	}
	
	static get buttonTitle() {
		return 'Load to release'
	}
	
	static get buttonSure() {
		return '<span class="text-warning font-weight-bold">Yes, I\'m sure</span>'
	}
	
	static setListener() {
		let load2release = document.querySelector('#load2release')
		if (load2release) {
			load2release.addEventListener('click', (event) => {
				if (event.target) {
					let textContent = event.target.textContent
					if (textContent == Test.buttonTitle) {
						event.target.textContent = '...'
						setTimeout(() => {
							event.target.innerHTML = Test.buttonSure
						}, 1000)
					} else {
						if (textContent.length > 3) {
							Test.load2release()
						}
					}
				}
			})
		}
	}
	
	static load2release() {
		let emit = window['socketIOemit']
		if (emit) {
			emit({t: 'load2release'})
		}
	}
}

document.addEventListener('DOMContentLoaded', () => {
	Test.showButton()
})