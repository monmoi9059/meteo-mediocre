const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  await page.goto('file://' + process.cwd() + '/info terminable MArtine.html');
  await page.waitForTimeout(1000);

  // Directly add hide-ui class
  await page.evaluate(() => {
    document.body.classList.add('hide-ui');
    if (window.updateCamera) {
      window.viewAzimuth = 90; // Look East
      window.updateCamera();
    }
  });

  await page.waitForTimeout(500); // allow transitions

  await page.screenshot({ path: 'screenshot_east_clean.png' });

  // Look West
  await page.evaluate(() => {
    if (window.updateCamera) {
      window.viewAzimuth = 270; // Look West
      window.updateCamera();
    }
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshot_west_clean.png' });

  await browser.close();
})();
