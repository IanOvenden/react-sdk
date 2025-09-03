const { config } = require('./config');

const launchPortal = async ({ page }) => {
  await page.setViewportSize({ width: 1720, height: 1080 });
  await page.goto(`${config.baseUrl}/portal`, { waitUntil: 'networkidle' });
};

const launchEmbedded = async ({ page }) => {
  await page.setViewportSize({ width: 1720, height: 1080 });
  await page.goto(`${config.baseUrl}/embedded`, { waitUntil: 'networkidle' });
};

const launchSelfServicePortal = async ({ page }) => {
  await page.setViewportSize({ width: 1720, height: 1080 });
  await page.goto(`${config.baseUrl}/portal?portal=DigV2SelfService`, {
    waitUntil: 'networkidle'
  });
};

const login = async (username, password, page) => {
  await page.waitForLoadState('networkidle');

  // Check if login form is in a popup/new page
  const context = page.context();

  // Check all existing pages and their URLs
  const existingPages = context.pages();

  // Look for a page that might be the login popup (not the main embedded page)
  let newPage = existingPages.find(p => p !== page && !p.url().includes('/embedded'));

  if (!newPage) {
    // Start listening for new page
    const popupPromise = context.waitForEvent('page', { timeout: 8000 });

    try {
      newPage = await popupPromise;
    } catch (e) {
      // No popup detected
    }
  }

  const loginPage = newPage || page;

  await loginPage.waitForLoadState('networkidle');

  // Additional wait for browser-specific rendering differences
  // await loginPage.waitForTimeout(2000);

  // Wait for login form elements to be available
  await loginPage.waitForSelector('input[id="txtUserID"]', { timeout: 15000 });
  await loginPage.waitForSelector('input[id="txtPassword"]', { timeout: 15000 });
  await loginPage.waitForSelector('#submit_row .loginButton', { timeout: 15000 });

  await loginPage.locator('input[id="txtUserID"]').fill(username);
  await loginPage.locator('input[id="txtPassword"]').fill(password);

  // Submit the form
  await loginPage.locator('#submit_row .loginButton').click();

  // Wait for authentication to complete on the main page
  const targetPage = newPage ? page : loginPage;
  await targetPage
    .waitForFunction(
      () => {
        // Check if we're logged in by looking for common post-login indicators
        return (
          document.querySelector('[data-test-id="authenticated"]') ||
          document.querySelector('.pega-header') ||
          document.querySelector('[data-node-id]') ||
          !document.querySelector('input[id="txtUserID"]') ||
          document.querySelector('button:has-text("shop now")')
        ); // Login form disappeared or content appeared
      },
      { timeout: 30000 }
    )
    .catch(async () => {
      // Fallback: just wait for network to settle
      await targetPage.waitForLoadState('networkidle', { timeout: 15000 });
    });

  // Additional wait to ensure authentication state is fully established
  // await page.waitForTimeout(2000);
};

const getAttributes = async element => {
  return element.evaluate(async ele => ele.getAttributeNames());
};

const getFormattedDate = date => {
  if (!date) {
    return date;
  }

  return `${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}${date.getFullYear()}`;
};

const getFutureDate = () => {
  const today = new Date();
  // const theLocale = Intl.DateTimeFormat().resolvedOptions().locale;
  // add 2 days to today
  const futureDate = new Date(today.setDate(today.getDate() + 2));

  // Need to get leading zeroes on single digit months and 4 digit year
  return getFormattedDate(futureDate);
};

const closePage = async page => {
  await page.close();
};

const enterPhoneNumber = async (phone, number) => {
  const phoneInput = phone.locator('input');
  await phoneInput.click();
  await phoneInput.pressSequentially(number);
};

module.exports = {
  launchPortal,
  launchEmbedded,
  launchSelfServicePortal,
  login,
  getAttributes,
  getFutureDate,
  closePage,
  enterPhoneNumber
};
