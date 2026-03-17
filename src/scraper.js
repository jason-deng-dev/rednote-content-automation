import axios from 'axios';
import * as cheerio from 'cheerio';

async function populateRaces(limit) {
    const races = [];
	let pageIndex = 1;

    const baseUrl = 'https://runjapan.jp/entry/runtes/smp/racesearchdetail.do'
    const firstPage = baseUrl + '?command=search'
    const incrementUrl = baseUrl + `?command=page&pageIndex=${pageIndex}`

	while (races.length < limit) {
		const res = await axios.get(firstPage, {
			timeout: 10000,
		});
        const $ = cheerio.load(res.data)

        
        $('.event-title a').each((i, el) => {
            const url = 'https://runjapan.jp' + $(el).attr('href')
            const raceName = $(el).children('span').text().trim()
            races.push({name: raceName, url:url})
        })
        break

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

    console.log(races)
}

populateRaces(1)