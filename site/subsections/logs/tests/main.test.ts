import Playwright from '../../../../_common/Playwright'

const label = 'Logs'
const url = Playwright.url(label)
const ip = (process.env.CURRENT_IP) as string
const header = label + ' @ ' + Playwright.prefix + '-' + ip
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

Playwright.test('header', async () => {
	const title = page.locator('nav.navbar h6')
	await Playwright.expect(title).toHaveText(header)
})

Playwright.test.afterAll(async ({ browser }) => {
	await browser.close()
})