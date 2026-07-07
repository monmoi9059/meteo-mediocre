const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + __dirname + '/info terminable MArtine.html');
  await page.waitForTimeout(3000);

  // Click the hide-ui button
  await page.evaluate(() => {
    document.body.classList.add('hide-ui');
  });

  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'dashboard_hideui.png', fullPage: true });
  await browser.close();
})();
