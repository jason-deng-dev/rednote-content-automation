import nodeCron from 'node-cron';
import { populateRaces } from './scraper.js';

function startScheduler() {
	// Weekly: scrape RunJapan every Sunday at 2am JST
	nodeCron.schedule(
		'0 2 * * 0',
		() => populateRaces(),
		{ timezone: 'Asia/Shanghai' },
	);

	console.log('Scheduler running — weekly scrape cron registered');
}

export { startScheduler };
