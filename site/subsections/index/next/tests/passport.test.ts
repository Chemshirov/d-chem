import Playwright from '../../../../../_common/Playwright'

const label = 'Passport'
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

Playwright.test('title', async () => {
	const title = page.locator('head > title')
	await Playwright.expect(title).toHaveText(label)
})

Playwright.test('number', async () => {
	const passportNumber = await page.locator('h2').textContent()
	let has9digits = (passportNumber.replace(/ /g, '').length === 9)
	await Playwright.expect(has9digits).toBeTruthy()
})

Playwright.test('lines', async () => {
	let selector = `div[class^="${label.toLowerCase()}_string"]`
	let firstLine = await page.locator(selector + ':nth-of-type(1)').textContent()
	let secondLine = await page.locator(selector + ':nth-of-type(2)').textContent()
	let hasLongLines = (firstLine.length > 30 && secondLine.length > 30)
	await Playwright.expect(hasLongLines).toBeTruthy()
})

Playwright.test('image', async () => {
	let selector = `div[class^="${label.toLowerCase()}_image"]`
	let imageRectSize = await page.evaluate(async (selector: string) => {
		let image = document.querySelector(selector)
		let rect = image.getBoundingClientRect()
		let width = rect.width
		let height = rect.height
		return { width, height }
	}, selector)
	let isHuge = (imageRectSize.width > pageSize.vw / 2 && imageRectSize.height > pageSize.vh / 2)
	let isFit = (imageRectSize.width < pageSize.vw && imageRectSize.height < pageSize.vh)
	let isVisible = await Playwright.areVisible(page, selector)
	await Playwright.expect(isHuge && isFit && isVisible).toBeTruthy()
})

Playwright.test.afterAll(async ({ browser }) => {
	await browser.close()
})