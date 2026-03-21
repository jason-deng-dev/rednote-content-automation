async function publishPost({ title, hook, contents, cta, description, hashtags, comments }) {
	console.log("=".repeat(60));
	console.log(`TITLE:       ${title}`);
	console.log(`HOOK:        ${hook}`);
	console.log(`DESCRIPTION: ${description}`);
	console.log("-".repeat(60));
	for (const [i, page] of contents.entries()) {
		console.log(`PAGE ${i + 1} — ${page.subtitle}`);
		console.log(page.body);
	}
	console.log("-".repeat(60));
	console.log(`CTA:         ${cta}`);
	console.log(`HASHTAGS:    ${hashtags.join(" ")}`);
	console.log("-".repeat(60));
	for (const [i, comment] of comments.entries()) {
		console.log(`COMMENT ${i + 1}: ${comment}`);
	}
	console.log("=".repeat(60));
	return true;
}

export { publishPost };
