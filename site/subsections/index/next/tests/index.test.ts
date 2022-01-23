import Playwright from '../../../../../_common/Playwright'

const label = 'Index'
const url = Playwright.url(label)
let page, pageSize

Playwright.test.use(Playwright.firefox)

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

Playwright.test('sections titles', async () => {
	const titles = await page.$$('div[class^="styles_main"] div[class^="styles_link"] h3')
	await Playwright.expect(titles.length >= 7).toBeTruthy()
})

Playwright.test.afterAll(async ({ browser }) => {
	await browser.close()
})