import axios from 'axios';
import * as cheerio from 'cheerio';

async function populateraces(limit) {
	const races = [];
	let pageIndex = 1;

	while (races.length < limit) {
		const res = await axios.get(`https://runjapan.jp/entry/runtes/smp/racesearchdetail.do?command=page&pageIndex=${pageIndex}`, {
			timeout: 10000,
		});
        const $ = cheerio.load(res.data)


        
		/*
        if res contains zero race cards => break

        for each race card on page:
            fetch detail page information
            extract info:
            push to races[]
            if race.length === limit => stop
        pageIndex++
        */
	}
}
