"use strict";

const { INVARIANT_BUDGET, fixture } = require("../../helpers/fixture");
const { renderBehavior } = require("../../helpers/syntaxInvariants/behavior");

/** @typedef {import("../../helpers/syntaxInvariants/relations").Report} Report */

// The `behavior` relation passes a print only where the browser styles every
// element as the source does, so it is held here to prints that style otherwise.
describe("CSS behavior relation", () => {
	const renders = renderBehavior("css");
	const source = fixture("css", "minimize");

	afterAll(() => renders.close());

	it("passes the source itself without rendering", async () => {
		expect(await renders.difference(source, source)).toEqual([]);
	});

	it("reports a value an element computes otherwise", async () => {
		const reports = /** @type {Report[]} */ (
			await renders.difference(
				source,
				source.replace("margin : 0  auto ;", "margin : 1px auto ;")
			)
		);
		expect(reports.some(({ repro }) => repro.includes("margin-top: "))).toBe(
			true
		);
	}, 60000);

	it("reports a dropped `!important`", async () => {
		const reports = /** @type {Report[]} */ (
			await renders.difference(
				source,
				`${source.replace(" !important", "")}\n.c{color:blue}`
			)
		);
		expect(reports.some(({ repro }) => repro.includes("color: "))).toBe(true);
	}, 60000);

	it("answers nothing for a source past the budget", async () => {
		const large = source + " ".repeat(INVARIANT_BUDGET);
		expect(await renders.difference(large, source)).toBeNull();
	});
});

describe("CSS styles compared under the color-scheme relaxation", () => {
	/** @type {import("playwright-core").Browser} */
	let browser;
	/** @type {import("playwright-core").Page} */
	let page;

	beforeAll(async () => {
		const { GENERIC_FONT_FAMILIES } = require("../../../lib/css/data");
		const {
			POLICED_PAGE,
			installHelpers
		} = require("../../helpers/syntaxEquivalence");

		browser = await require("../../helpers/launchBrowser")();
		page = await browser.newPage();
		await page.setContent(POLICED_PAGE);
		await page.evaluate(installHelpers, [...GENERIC_FONT_FAMILIES]);
	}, 120000);

	afterAll(async () => {
		if (browser) await browser.close();
	});

	/**
	 * @param {[string, string, string][]} pairs per pair its name and both sheets
	 * @returns {Promise<Record<string, number>>} per pair how many lines differ
	 */
	const differences = async (pairs) => {
		const {
			cascadeLines,
			compareStyles
		} = require("../../helpers/syntaxEquivalence");
		/** @type {import("../../helpers/syntaxEquivalence").StyleReport[]} */
		/** @type {import("../../helpers/syntaxEquivalence").StylePair[]} */
		const compared = pairs.map(([name, before, after]) => ({
			name,
			before,
			after,
			relax: ["color-scheme"]
		}));
		const reports = await page.evaluate(compareStyles, {
			pairs: compared,
			types: []
		});
		return Object.fromEntries(
			reports.map((report) => [report.name, cascadeLines(report).length])
		);
	};

	it("leaves out only what the used color scheme alone moves", async () => {
		const lowered = ":where(:root){--webpack-light:initial;--webpack-dark:}";
		const counts = await differences([
			[
				"lowered",
				"div{color:light-dark(red,blue)}@media (prefers-color-scheme:dark){b{color:light-dark(green,yellow)}}",
				`div{color:var(--webpack-light,red)var(--webpack-dark,blue)}@media (prefers-color-scheme:dark){b{color:var(--webpack-light,green)var(--webpack-dark,#ff0)}}${lowered}`
			],
			[
				"before",
				"div::before{content:'x';color:light-dark(red,blue)}@media (prefers-color-scheme:dark){div{margin-left:0}}",
				`div::before{content:'x';color:var(--webpack-light,red)var(--webpack-dark,blue)}@media (prefers-color-scheme:dark){div{margin-left:0}}${lowered}`
			],
			[
				"rooted",
				":root{color-scheme:light dark}div{color:light-dark(red,blue)}@media (prefers-color-scheme:dark){div{margin-left:0}}",
				`:root{color-scheme:light dark}div{color:var(--webpack-light,red)var(--webpack-dark,blue)}@media (prefers-color-scheme:dark){div{margin-left:0}}${lowered}`
			],
			[
				"query",
				"@media (prefers-color-scheme:dark){div{color:red}}",
				"@media (prefers-color-scheme:dark){div{color:blue}}"
			],
			[
				"beside",
				".a{color:light-dark(red,blue)}@media (prefers-color-scheme:dark){.a{margin-left:1px}}",
				".a{color:light-dark(red,blue)}@media (prefers-color-scheme:dark){.a{margin-left:2px}}"
			],
			[
				"winning",
				"div{color:light-dark(red,blue)}@media (prefers-color-scheme:dark){div{color:green}}",
				"div{color:red}@media (prefers-color-scheme:dark){div{color:purple}}"
			]
		]);
		expect(counts.lowered).toBe(0);
		expect(counts.before).toBe(0);
		expect(counts.rooted).toBe(0);
		expect(counts.query).toBeGreaterThan(0);
		expect(counts.beside).toBeGreaterThan(0);
		expect(counts.winning).toBeGreaterThan(0);
	}, 120000);
});
