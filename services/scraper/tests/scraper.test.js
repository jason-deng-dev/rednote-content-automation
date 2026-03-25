// scraper.test.js
// Tests: validate scraper output shape, required fields, minimum race count
// Tested against sample-races.json fixture — shape/completeness, not exact content
import { describe, it, expect } from "vitest";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { races } = JSON.parse(
	fs.readFileSync(
		path.resolve(__dirname, "./fixtures/sample-races.json"),
		"utf-8",
	),
);

const REQUIRED_FIELDS = [
	"name",
	"date",
	"location",
	"entryStart",
	"entryEnd",
	"website",
	"description",
	"registrationOpen",
	"registrationUrl",
];

describe("scraper output", () => {
	describe("top-level shape", () => {
		it("races is an array", () => {
			expect(races).toBeInstanceOf(Array);
		});

		it("contains at least 10 races", () => {
			expect(races.length).toBeGreaterThanOrEqual(10);
		});

		it("each race is an object", () => {
			for (const race of races) {
				expect(typeof race).toBe("object");
				expect(race).not.toBeNull();
			}
		});
	});

	describe("required fields", () => {
		it("every race has all required fields", () => {
			for (const race of races) {
				for (const field of REQUIRED_FIELDS) {
					expect(race, `race "${race.name}" missing field "${field}"`).toHaveProperty(field);
				}
			}
		});

		it("name is a non-empty string on every race", () => {
			for (const race of races) {
				expect(typeof race.name).toBe("string");
				expect(race.name.length).toBeGreaterThan(0);
			}
		});

		it("url is a non-empty string on every race", () => {
			for (const race of races) {
				expect(typeof race.url).toBe("string");
				expect(race.url.length).toBeGreaterThan(0);
			}
		});

		it("description is a string on every race (may be empty if not on page)", () => {
			for (const race of races) {
				expect(typeof race.description).toBe("string");
			}
		});

		it("images is an array on every race", () => {
			for (const race of races) {
				expect(race.images).toBeInstanceOf(Array);
			}
		});
	});

	describe("field formats", () => {
		it("registrationOpen is true, false, or null on every race", () => {
			for (const race of races) {
				expect(
					race.registrationOpen === true ||
					race.registrationOpen === false ||
					race.registrationOpen === null,
					`race "${race.name}" has invalid registrationOpen: ${race.registrationOpen}`
				).toBe(true);
			}
		});

		it("date field contains a year on every race", () => {
			for (const race of races) {
				if (race.date) {
					expect(race.date).toMatch(/20\d\d/);
				}
			}
		});

		it("url starts with https://runjapan.jp on every race", () => {
			for (const race of races) {
				expect(race.url).toMatch(/^https:\/\/runjapan\.jp/);
			}
		});

		it("registrationUrl starts with https:// or is null", () => {
			for (const race of races) {
				if (race.registrationUrl !== null) {
					expect(race.registrationUrl).toMatch(/^https:\/\//);
				}
			}
		});
	});
});
