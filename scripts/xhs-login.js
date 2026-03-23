import { chromium } from 'playwright';
import fs from 'fs';

const browser = await chromium.launch({ headless: false });

if (!fs.existsSync('auth.json')) {
	fs.writeFileSync('auth.json', '{"cookies":[],"origins":[]}');
}

const context = await browser.newContext({ storageState: 'auth.json' });

const page = await context.newPage();

await page.goto('https://www.xiaohongshu.com');
await page.pause(); 

await page.goto('https://creator.xiaohongshu.com/publish/publish');
await page.pause(); 

await context.storageState({ path: 'auth.json' }); // saves cookies/session to file
await browser.close();
