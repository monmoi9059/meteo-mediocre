import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=['--no-sandbox', '--disable-setuid-sandbox'])
        page = await browser.new_page(viewport={'width': 1280, 'height': 720})
        await page.goto('file:///app/info%20terminable%20MArtine.html')
        await page.wait_for_selector('.weather-header', timeout=5000)
        await page.wait_for_timeout(2000)

        # click the 24 hours button
        await page.click('button:has-text("24 Heures")')
        await page.wait_for_selector('.modal-content', timeout=5000)
        await page.screenshot(path='/home/jules/verification/feels_like_hourly_modal.png')
        await browser.close()

asyncio.run(main())
