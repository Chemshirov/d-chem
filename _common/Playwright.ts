import * as tc from './types'
import * as playwright from '@playwright/test'
const Settings: tc.settings = require('./Settings')

export default class Playwright {
	
	static get test() {
		return playwright.test
	}
	
	static get expect() {
		return playwright.expect
	}
	
	static get devices() {
		return playwright.devices
	}
	
	static get workdir() {
		return (process.env.WORKDIR + '/') as string
	}
	
	static get stage() {
		return (process.env.STAGE ?? '') as string
	}
	
	static get domain() {
		return (process.env.DOMAIN ?? '') as string
	}
	
	static get prefix() {
		return Playwright.stage.substring(0, 1)
	}
	
	static get mainLabel() {
		return Settings.mainLabel
	}
	
	static url(label: string): string {
		return 'https://' + Playwright.domain + '/' + label.toLowerCase()
	}
	
	static get hd() {
		return {
			width: 1920,
			height: 1080
		}
	}
	
	static get hdViewport() {
		return { 
			width: Playwright.hd.width,
			height: Playwright.hd.height
		}
	}
	
	static get iPhoneToUse() {
		return {
			browserName: 'webkit',
			...playwright.devices['iPhone 13 Mini'],
			screenshot: 'off',
		}
	}
	
	static get chromium() {
		return {
			browserName: 'chromium',
			viewport: Playwright.hdViewport,
			screenshot: 'off',
		}
	}
	
	static get firefox() {
		return {
			browserName: 'firefox',
			viewport: Playwright.hdViewport,
			screenshot: 'off',
		}
	}
	
	static get webkit() {
		return {
			browserName: 'webkit',
			viewport: { width: 3840, height: 2160 },
			screenshot: 'off',
		}
	}
	
	static async areVisible(page: playwright.Page, selector: string): Promise<boolean> {
		let areVisible = await page.evaluate((selector: string) => {
			let areVisible = false
			const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
			const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
			let isElementVisible = (element: HTMLElement, vw: number, vh: number) => {
				let isVisible = false
				let rect = element.getBoundingClientRect()
				if (rect.top > 0 && rect.left > 0) {
					if (rect.right <= vw && rect.bottom <= vh) {
						isVisible = true
					}
				}
				return isVisible
			}
			let elements = document.querySelectorAll(selector)
			if (elements) {
				for (let i = 0; i < elements.length; i++) {
					let element = elements[i] as HTMLElement
					let isVisible = isElementVisible(element, vw, vh)
					areVisible = isVisible
					if (!isVisible) {
						break
					}
				}
			}
			return areVisible
		}, selector)
		return areVisible
	}
	
	static async takeScreenshot(label: string): Promise<void> {
		const url = Playwright.url(label)
		const browser = await playwright.chromium.launch()
		const context = await browser.newContext({ viewport: Playwright.hdViewport })
		const page = await context.newPage()
		await page.goto(url)
		await page.screenshot({ path: Playwright.ogFilePath(label), fullPage: true })
		await browser.close()
	}
	
	static ogFilePath(label: string): string {
		let sdaStagePath = (process.env.SDA + Settings.stage + '/') as string
		let subsectionsPath = sdaStagePath + Settings.label + '/subsections/'
		let ogPath = subsectionsPath + label.toLowerCase() + '/stageSensitive/'
		return ogPath + 'ogImage.png'
	}
	
	static requestForTesting(rabbitMQ: tc.RabbitMQ, pathToTests: string) {
		rabbitMQ.send({ label: 'Playwright', pathToTests })
	}
}