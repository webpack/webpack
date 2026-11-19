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
 * @property {(source: string, printed: string) => Promise<Report[] | null>} difference what the print renders otherwise, null where the source is past `INVARIANT_BUDGET` or, in XML, no SVG document
 * @property {() => Promise<void>} close closes the browser, where one was launched
 */

// The canvas both drawings are scaled onto, and how far one channel of a pixel
// may move before it counts: what antialiasing a rounded coordinate shifts.
const SVG_CANVAS = 256;
const SVG_CHANNEL_TOLERANCE = 48;

/**
 * Runs in the page: draws both documents as images onto one canvas size and
 * compares their pixels. Pixels rather than elements, as a print may merge,
 * convert or drop elements and still draw the same.
 * @param {{ before: string, after: string, size: number, tolerance: number }} input the source, its print, the canvas size and the channel tolerance
 * @returns {Promise<string[] | null>} one line per difference, null where the source is no SVG document
 */
const compareSvgRenders = async ({ before, after, size, tolerance }) => {
	const SVG = "http://www.w3.org/2000/svg";
	/**
	 * @param {string} text a document
	 * @returns {Element | null} its root where it is an SVG document
	 */
	const rootOf = (text) => {
		const root = new DOMParser().parseFromString(text, "image/svg+xml")
			.documentElement;
		return root.namespaceURI === SVG && root.localName === "svg" ? root : null;
	};
	/**
	 * @param {string} text a document
	 * @returns {Promise<{ width: number, height: number, data: Uint8ClampedArray } | null>} its natural size and its pixels scaled onto the canvas, null where it draws nothing
	 */
	const pixelsOf = async (text) => {
		const image = new Image();
		image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
		try {
			await image.decode();
		} catch (_error) {
			return null;
		}
		const canvas = document.createElement("canvas");
		canvas.width = size;
		canvas.height = size;
		const context = /** @type {CanvasRenderingContext2D} */ (
			canvas.getContext("2d")
		);
		context.drawImage(image, 0, 0, size, size);
		return {
			width: image.naturalWidth,
			height: image.naturalHeight,
			data: context.getImageData(0, 0, size, size).data
		};
	};
	const source = rootOf(before);
	if (source === null) return null;
	const printed = rootOf(after);
	if (printed === null) return ["the print parses as no SVG document"];
	if (after === before) return [];
	/** @type {string[]} */
	const out = [];
	const [drawn, redrawn] = await Promise.all([
		pixelsOf(before),
		pixelsOf(after)
	]);
	if (drawn === null || redrawn === null) {
		if (drawn !== redrawn) out.push("one of the two draws nothing");
	} else if (
		drawn.width !== redrawn.width ||
		drawn.height !== redrawn.height
	) {
		// Both are scaled onto one canvas, so a size moved alone draws alike there.
		out.push(
			`draws at ${drawn.width}x${drawn.height} -> ${redrawn.width}x${redrawn.height}`
		);
	} else {
		const mine = drawn.data;
		const theirs = redrawn.data;
		let moved = 0;
		let first = -1;
		for (let at = 0; at < mine.length; at += 4) {
			for (let channel = 0; channel < 4; channel++) {
				if (Math.abs(mine[at + channel] - theirs[at + channel]) > tolerance) {
					if (first === -1) first = at;
					moved++;
					break;
				}
			}
		}
		if (moved > 0) {
			const pixel = first / 4;
			out.push(
				`${moved} pixels draw otherwise, first at ${pixel % size},${Math.floor(pixel / size)}: ${mine.slice(first, first + 4).join(",")} -> ${theirs.slice(first, first + 4).join(",")}`
			);
		}
	}
	return out;
};

/**
 * One pinned Chrome per suite, launched on the first print it renders. An HTML
 * page is rendered at every width of `RENDER_WIDTHS` by `compareRenders`, which
 * compares every element's boxes, its `style` attribute and the text; a CSS
 * sheet styles the elements its selectors reach, and `compareStyles` compares
 * each one's computed style at every breakpoint either sheet's queries name;
 * an SVG document is drawn by `compareSvgRenders` and compared pixel by pixel.
 * @param {"css" | "html" | "xml"} lang what the sources are
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
			// An XML source owes an SVG root first, so a marked document no browser
			// draws fails even where its print is unchanged.
			if (printed === source && lang !== "xml") return [];
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
			if (lang === "xml") {
				const lines = await opened.evaluate(compareSvgRenders, {
					before: source,
					after: printed,
					size: SVG_CANVAS,
					tolerance: SVG_CHANNEL_TOLERANCE
				});
				if (lines === null) return null;
				for (const line of lines) {
					reports.push({
						relation: "behavior",
						what: "draws otherwise",
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
