import Playwright from '../../../../_common/Playwright'

const label = 'Git'
const url = Playwright.url(label)

Playwright.test.use(Playwright.firefox)

Playwright.test('size check', async ({ page }) => {
	await page.goto(url)
	const size = await page.evaluate(async () => {
		const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
		const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
		return { vw, vh }
	})
	await Playwright.test.expect(size.vw).toEqual(Playwright.hd.width)
	await Playwright.test.expect(size.vh).toEqual(Playwright.hd.height)
	const topText = page.locator('.container-fluid.text-right > small.text-muted')
	await Playwright.expect(topText).toContainText('Git started at ')
})