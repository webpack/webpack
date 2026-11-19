/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { INVARIANT_BUDGET } = require("../fixture");

/** @typedef {import("./relations").Report} Report */

/**
 * A browser that renders a source and its print alike, for the `behavior`
 * relation of the languages a browser runs.
 * @typedef {object} RenderBehavior
 * @property {(source: string, printed: string) => Promise<Report[] | null>} difference what the print renders otherwise, null where the source is past `INVARIANT_BUDGET`
 * @property {() => Promise<void>} close closes the browser, where one was launched
 */

/**
 * One pinned Chrome per suite, launched on the first print it renders. An HTML
 * page is rendered at every width of `RENDER_WIDTHS` by `compareRenders`, which
 * compares every element's boxes, its `style` attribute and the text; a CSS
 * sheet styles the elements its selectors reach, and `compareStyles` compares
 * each one's computed style at every breakpoint either sheet's queries name.
 * @param {"css" | "html"} lang what the sources are
 * @returns {RenderBehavior} the runner
 */
const renderBehavior = (lang) => {
	/** @type {import("playwright-core").Browser | undefined} */
	let browser;
	/** @type {import("playwright-core").Page | undefined} */
	let page;

	/** @returns {Promise<import("playwright-core").Page>} the page the helpers are installed in */
	const open = async () => {
		if (page !== undefined) return page;
		const { GENERIC_FONT_FAMILIES } = require("../../../lib/css/data");
		const { POLICED_PAGE, installHelpers } = require("../syntaxEquivalence");

		browser = await require("../launchBrowser")();
		page = await browser.newPage();
		await page.setContent(POLICED_PAGE);
		await page.evaluate(installHelpers, [...GENERIC_FONT_FAMILIES]);
		return page;
	};

	return {
		difference: async (source, printed) => {
			if (source.length > INVARIANT_BUDGET) return null;
			if (printed === source) return [];
			const {
				RENDER_WIDTHS,
				cascadeLines,
				compareRenders,
				compareStyles
			} = require("../syntaxEquivalence");

			const opened = await open();
			/** @type {Report[]} */
			const reports = [];
			if (lang === "css") {
				const [report] = await opened.evaluate(compareStyles, {
					pairs: [{ name: "print", before: source, after: printed }],
					types: []
				});
				for (const line of cascadeLines(report)) {
					reports.push({
						relation: "behavior",
						what: "styles otherwise",
						repro: `    ${line}`
					});
				}
				return reports;
			}
			for (const width of RENDER_WIDTHS) {
				const [report] = await opened.evaluate(compareRenders, {
					pairs: [{ name: "print", before: source, after: printed }],
					width
				});
				for (const difference of report.differences) {
					reports.push({
						relation: "behavior",
						what: "renders otherwise",
						repro: `    ${width}px ${difference}`
					});
				}
			}
			return reports;
		},
		close: async () => {
			if (browser !== undefined) await browser.close();
			browser = undefined;
			page = undefined;
		}
	};
};

module.exports = { renderBehavior };
