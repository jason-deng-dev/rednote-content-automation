import { chromium } from 'playwright';


const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ storageState: 'auth.json' });
const page = await context.newPage();
// { title, hook, contents, cta, description, hashtags, comments }
async function publishPost() {
	await page.goto('https://creator.xiaohongshu.com/publish/publish');
	await page.getByText('写长文').click();
	await page.getByText('新的创作').click();
	// title
	await page.getByPlaceholder('输入标题').fill('test title');
	await page.locator('[data-placeholder="输入文字，内容将自动保存"]').click();
	// content
	await page.keyboard.type('your text here');
	await page.getByText('一键排版').click();
	await page.getByText('下一步').click();
	await page.locator('[data-placeholder="输入正文描述，真诚有价值的分享予人温暖"]').click();
	// description/tags
	await page.keyboard.type('description/tags');
	// XHS opens profile in a new tab after publishing — capture it
	await page.waitForTimeout(2000);
	await page.getByRole('button', { name: '发布' }).click();
	await page.waitForURL('**/success?source&bind_status=not_bind&__debugger__=&proxy=');

	await page.goto('https://www.xiaohongshu.com/user/profile/68b4ecc6000000001802f0e9?tab=note&subTab=note');

	await page.waitForSelector('#userPostedFeeds .note-item');
	await page.locator('#userPostedFeeds .note-item').first().click();
	await page.locator('.not-active.inner-when-not-active').click();
	await page.locator('#content-textarea').click();
	await page.keyboard.type('test comment');
	await page.getByRole('button', { name: '发送' }).click();
}

await publishPost();

export { publishPost };
