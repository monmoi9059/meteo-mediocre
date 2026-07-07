const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + __dirname + '/info terminable MArtine.html');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'dashboard.png', fullPage: true });
  await browser.close();
})();
