import { generatePost } from "../src/generator.js";
const type = process.argv[2] ? process.argv[2]:'race';

const post = await generatePost(type);
console.log(JSON.stringify(post));