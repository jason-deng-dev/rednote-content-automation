import 'dotenv/config';
import fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';

const prompts = JSON.parse(fs.readFileSync('./config/prompts.json', 'utf-8'));
const races = JSON.parse(fs.readFileSync('./data/races.json', 'utf-8'));
const client = new Anthropic({
	apiKey: process.env['ANTHROPIC_API_KEY'],
});

async function generatePosts(type) {
	const systemPrompt = prompts.systemPrompt;
	let contextToUse;

	let comments;

	let ctaDescription;

	switch (type) {
		case 'race': {
			let raceContext = prompts.postTypes.raceGuide;
			const raceChosen = await chooseRaceMock();
			const race = races.races.find((item) => item.name === raceChosen);
			const fields = ['name', 'date', 'location', 'entryStart', 'entryEnd', 'registrationOpen', 'registrationUrl', 'website', 'description'];
			for (const field of fields) {
				raceContext = raceContext.replace(`race.${field}`, race[field]);
			}
			contextToUse = raceContext;
			ctaDescription = 'our marathon hub where readers can find full race details, registration timelines, and sign-up links for Japanese marathons';
			comments = [
				'想了解更多关于这场比赛的详细信息和报名攻略？👇 {{CTA_URL}}',
				'加入我们的跑步社区，和其他计划去日本跑马的小伙伴一起交流👇 {{COMMUNITY_URL}}',
			];
			break;
		}
		case 'training': {
			contextToUse = prompts.postTypes.training;
			ctaDescription = 'our marathon preparation tools suite, designed for Chinese runners training for Japanese races';
			comments = [
				'想了解更多训练技巧？👇 {{CTA_URL}}',
				'加入我们的跑步社区，和其他计划去日本跑马的小伙伴一起交流👇 {{COMMUNITY_URL}}',
			];
			break;
		}
		case 'nutritionSupplement': {
			contextToUse = prompts.postTypes.nutritionSupplement;
			ctaDescription = 'our online store offering authentic Japanese running nutrition and supplements, available for import to China';
			comments = [
				'想购买正品日本跑步营养品？👇 {{CTA_URL}}',
				'加入我们的跑步社区，和其他计划去日本跑马的小伙伴一起交流👇 {{COMMUNITY_URL}}',
			];
			break;
		}
		default:
			throw new Error('Incorrect type used');
	}

	contextToUse += `\n\nCTA: Direct readers to ${ctaDescription}. Tell them the link is in the comments.`;

	const message = await client.messages.create({
		max_tokens: 1024,
		system: systemPrompt,
		messages: [{ role: 'user', content: contextToUse }],
		model: 'claude-sonnet-4-6',
	});

	console.log(message);
	return message
}

async function chooseRace() {
	let raceStr = '';
	for (const race of races.races) {
		raceStr += race.name + '|||';
	}
	// const post_history = JSON.parse(fs.readFileSync('./data/post_history.json', 'utf-8'));
	// filter races that are in post_history

	let systemRaceSelectionPrompt = prompts.systemRaceSelectionPrompt;
	let contextChooseRace = prompts.contextRaceSelection + raceStr;
	const raceSelection = await client.messages.create({
		max_tokens: 1024,
		system: systemRaceSelectionPrompt,
		messages: [{ role: 'user', content: contextChooseRace }],
		model: 'claude-sonnet-4-6',
	});
	return raceSelection.content[0].text;
}

function chooseRaceMock() {
	return "The 5th Mt. Fuji Sanroku Women's Trail Run";
}

// generatePosts('race');
