import Playwright from '../../../../_common/Playwright'

const label = 'Git'
const url = Playwright.url(label)
const stageName = Playwright.prefix + '-' + Playwright.mainLabel
let page, pageSize

Playwright.test.use(Playwright.iPhoneToUse)

Playwright.test.beforeAll(async ({ browser }) => {
	const context = await browser.newContext()
	page = await context.newPage()
	await page.goto(url)
	pageSize = await page.evaluate(async () => {
		const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
		const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
		return { vw, vh }
	})
})

Playwright.test.describe('group', () => {
	Playwright.test('header', async () => {
		const title = page.locator(`#${stageName} h3`)
		await Playwright.expect(title).toHaveText(stageName)
	})
	
	Playwright.test('master branch', async () => {
		const title = page.locator(`#${stageName} h4`)
		await Playwright.expect(title).toHaveText('master')
	})
})

Playwright.test('all buttons are visible', async () => {
	let selector = 'button:not([type="submit"]):not([copyToProduction]):not([pull])'
	let areVisible = await Playwright.areVisible(page, selector)
	await Playwright.expect(areVisible).toBeTruthy()
})

Playwright.test.afterAll(async ({ browser }) => {
	await browser.close()
})