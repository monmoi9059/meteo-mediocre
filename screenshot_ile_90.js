const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('file://' + process.cwd() + '/info terminable MArtine.html', { waitUntil: 'networkidle' });

  await page.waitForTimeout(2000);

  // Click "Cacher UI" button to properly unlock camera
  await page.evaluate(() => {
    const hideBtn = document.getElementById('btn-hide-ui');
    if (hideBtn) hideBtn.click();
  });

  await page.waitForTimeout(1000);

  // Now set azimuth
  await page.evaluate(() => {
    if (typeof window.viewAzimuth !== 'undefined') {
      window.viewAzimuth = 90;
      if (typeof updateCamera === 'function') updateCamera();
    }
  });

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot_east.png' });

  await page.evaluate(() => {
    if (typeof window.viewAzimuth !== 'undefined') {
      window.viewAzimuth = 270;
      if (typeof updateCamera === 'function') updateCamera();
    }
  });

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot_west.png' });

  await browser.close();
})();
