export default class Settings {
	static get cookiePrefix() {
		return 'chem'
	}
	
	static get urls() {
		return {
			serviceWorker: '/serviceWorker.js',
		}
	}
	
	static get miniWidth() {
		return '192px'
	}
	
	static get timeZone() {
		return 3
	}
}