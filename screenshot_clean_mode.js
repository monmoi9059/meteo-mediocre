const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1200, height: 675 });
  await page.goto('file://' + __dirname + '/info terminable MArtine.html');

  // Wait for loading
  await page.waitForTimeout(2000);

  // Enable clean mode
  await page.evaluate(() => {
    document.body.classList.add('hide-ui');
  });

  // Set viewAzimuth to 0 (North)
  await page.evaluate(() => {
    window.viewAzimuth = 0;
    if(typeof updateCamera === 'function') updateCamera();
  });

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot_north_shore.png' });

  // Set viewAzimuth to 180 (South)
  await page.evaluate(() => {
    window.viewAzimuth = 180;
    if(typeof updateCamera === 'function') updateCamera();
  });

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot_south_shore.png' });

  await browser.close();
  console.log('Screenshots saved as screenshot_north_shore.png and screenshot_south_shore.png');
})();
