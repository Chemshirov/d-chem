import Playwright from '../../../../../_common/Playwright'

const label = 'Multiserver'
let page

Playwright.test.use(Playwright.firefox)

Playwright.test.beforeAll(async ({ browser }) => {
	const context = await browser.newContext()
	page = await context.newPage()
	const url = Playwright.url(label)
	await page.goto(url)
})

Playwright.test('header', async () => {
	const title = page.locator('div[class^="header_title"]')
	await Playwright.expect(title).toHaveText(label)
})

Playwright.test.afterAll(async ({ browser }) => {
	await browser.close()
})