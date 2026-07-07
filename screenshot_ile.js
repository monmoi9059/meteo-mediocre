const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    const filePath = 'file://' + path.resolve('info terminable MArtine.html');

    await page.goto(filePath);
    await page.waitForTimeout(2000); // let UI load

    // Hide UI
    await page.evaluate(() => {
        document.body.classList.add('hide-ui');
        // Point to East (90)
        window.viewAzimuth = 90;
        if (typeof updateCamera === 'function') {
            updateCamera();
        }
    });

    await page.waitForTimeout(2000); // let animations settle

    await page.screenshot({ path: 'screenshot_ile_east_90_noui.png' });

    await browser.close();
})();
