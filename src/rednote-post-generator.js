import 'dotenv/config';
import fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';

async function generatePosts(amount, type) {
	const client = new Anthropic({
		apiKey: process.env['ANTHROPIC_API_KEY'],
	});

	const prompts = JSON.parse(fs.readFileSync('./config/prompts.json', 'utf-8'));
	let systemPrompt = prompts.systemPrompt;
	let raceContext = prompts.postTypes.raceGuide;
	let trainingContext = prompts.postTypes.training;
	let nutritionSupplementContext = prompts.postTypes.nutritionSupplement;
	let contextToUse;
	switch (type) {
		case 'race':
			contextToUse = raceContext;
			break;
		case 'training':
			contextToUse = trainingContext;
			break;
		case 'nutritionSupplement':
			contextToUse = nutritionSupplementContext;
			break;
		default:
			throw new Error('Incorrect type used');
	}

	// generate type

	const message = await client.messages.create({
		max_tokens: 1024,
		system: systemPrompt,
		messages: [{ role: 'user', content: contextToUse }],
		model: 'claude-sonnet-4-6',
	});

	console.log(message.content);
}

generatePosts(1, 'race')