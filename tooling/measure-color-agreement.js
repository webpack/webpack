/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// Re-derive how far a browser's color conversions sit from webpack's, which is
// what `lib/css/syntax.js` reads its rounding margins from: a color is converted
// to a byte only where the byte is the one the engine's own conversion lands on.
//
//   node tooling/measure-color-agreement.js [--samples 4000]
//
// The engine is asked for its own answer rather than for a pixel:
// `color(from <color> srgb r g b)` serializes what it computed, at more digits
// than a byte holds. Every sample is compared in two ways, because the printer's
// margins are two:
//
//   * in linear light, relative to the color's own magnitude — an engine's
//     transfer function is a fitted curve rather than the spec's, and a matrix
//     carries that into every term of the product, so this is what a conversion
//     through one can be out by;
//   * in encoded units through the transfer alone, which is what a color needing
//     no matrix (`color(srgb-linear …)`) can be out by.
//
// It also re-derives the spaces an engine reads through a different transfer
// altogether — Chromium takes a98-rgb's gamma as 2.2 rather than 563/256, and
// ProPhoto's as a pure 1.8 with none of the linear segment below 16/512 — by
// sweeping each space's own range. No margin bridges those, so a color written
// in one is left as it stands.
//
// Set `PUPPETEER_EXECUTABLE_PATH` to measure a browser other than the installed
// Chrome channel. The constants the run prints are the measured maxima; the ones
// in `lib/css/syntax.js` carry a safety factor above them, since only the engines
// that can be run here have been measured.

const {
	COLOR_SPACE_MODEL,
	PREDEFINED_COLOR_SPACES
} = require("../lib/css/data");
const launchChrome = require("../test/helpers/launchChrome");

/**
 * @param {string} name the flag
 * @param {number} fallback what it is worth when the flag is not there
 * @returns {number} the value
 */
const argument = (name, fallback) => {
	const at = process.argv.indexOf(`--${name}`);
	return at === -1 ? fallback : Number(process.argv[at + 1]);
};

// Every number here is a maximum over the corpus, so a larger run is a tighter
// bound rather than a different answer — the constants in `lib/css/syntax.js`
// come from `--samples 3000`.
const SAMPLES = argument("samples", 3000);
// The safety factor the printer's constants carry over what one engine shows.
const HEDGE = 1.6;

/**
 * The seeded sequence the corpus is drawn from, so two runs measure the same
 * colors and a change in the numbers is a change in the answer.
 * @param {number} seed the seed
 * @returns {() => number} the sequence
 */
const sequence = (seed) => () => {
	seed = (seed * 1103515245 + 12345) % 2147483648;
	return seed / 2147483648;
};

/**
 * sRGB's transfer function and its inverse (CSS Color 4 §10.2), which the
 * comparison reads both ways: the engine answers in encoded units and the
 * disagreement is flat in linear light.
 * @param {number} c one encoded component
 * @returns {number} the linear-light component
 */
const decode = (c) => {
	const abs = Math.abs(c);
	const sign = c < 0 ? -1 : 1;
	return abs <= 0.04045 ? c / 12.92 : sign * ((abs + 0.055) / 1.055) ** 2.4;
};

/**
 * Ask the browser for its own conversion of each color into sRGB.
 * @param {import("puppeteer-core").Page} page the page to read from
 * @param {string[]} colors the colors as written
 * @returns {Promise<(number[] | null)[]>} each color's sRGB components, or null where it read none
 */
const readSrgb = async (page, colors) => {
	/** @type {(number[] | null)[]} */
	const out = [];
	const CHUNK = 400;
	for (let at = 0; at < colors.length; at += CHUNK) {
		const read = await page.evaluate(
			(chunk) => {
				const element = /** @type {HTMLElement} */ (
					document.getElementById("probe")
				);
				return chunk.map((color) => {
					element.style.color = "black";
					element.style.color = `color(from ${color} srgb r g b)`;
					return getComputedStyle(element).color;
				});
			},
			colors.slice(at, at + CHUNK)
		);
		for (const text of read) {
			const parsed = /^color\(srgb ([^)]+)\)$/.exec(text);
			out.push(
				parsed === null
					? null
					: parsed[1]
							.split(/[\s/]+/)
							.slice(0, 3)
							.map(Number)
			);
		}
	}
	return out;
};

/**
 * webpack's own conversion of one `color()` into raw sRGB channels, read through
 * the same tables the printer uses.
 * @param {string} name the space
 * @param {number[]} components the color's components in it
 * @returns {number[]} the sRGB components
 */
const ours = (name, components) => {
	const space =
		/** @type {NonNullable<ReturnType<typeof PREDEFINED_COLOR_SPACES.get>>} */ (
			PREDEFINED_COLOR_SPACES.get(name)
		);
	const linear = components.map((component) => space.transfer(component));
	const matrix = space.toSrgb;
	return [0, 3, 6].map(
		(row) =>
			matrix[row] * linear[0] +
			matrix[row + 1] * linear[1] +
			matrix[row + 2] * linear[2]
	);
};

/**
 * @param {number} c one linear-light component
 * @returns {number} the encoded component
 */
const encode = (c) => {
	const abs = Math.abs(c);
	const sign = c < 0 ? -1 : 1;
	return abs <= 0.0031308
		? 12.92 * c
		: sign * (1.055 * abs ** (1 / 2.4) - 0.055);
};

// The Lab family reaches sRGB through a matrix chain of its own, so it carries
// the same disagreement and the same constant covers it.
const POLAR_SPACES = ["lab", "lch", "oklab", "oklch"];

/**
 * @param {string} space one of `POLAR_SPACES`
 * @param {() => number} random the sequence
 * @returns {{ text: string, components: number[] }} a color in it
 */
const polarSample = (space, random) => {
	const wide = space === "lab" || space === "lch";
	const lightness = random() * (wide ? 100 : 1);
	const second = wide
		? random() * 140 - (space === "lab" ? 70 : 0)
		: random() * 0.4 - (space === "oklab" ? 0.2 : 0);
	const third = space.endsWith("ch")
		? random() * 360
		: wide
			? random() * 140 - 70
			: random() * 0.4 - 0.2;
	const components = [lightness, second, third].map((value) =>
		Number(value.toFixed(6))
	);
	return {
		text: `${space}(${components[0]}${wide ? "%" : ""} ${components[1]} ${components[2]})`,
		components
	};
};

/**
 * The spaces the engine reads through a different transfer function than the one
 * CSS Color 4 states, out of a sweep of each space's own range. What a matrix
 * disagreement does is scale every value by about one factor; what a different
 * transfer does is bend the bottom of the range away from the top, so the spread
 * of the ratio is what names them.
 * @param {import("puppeteer-core").Page} page the page to read from
 * @param {string[]} spaces the spaces to sweep
 * @returns {Promise<string[]>} the spaces whose transfer the engine reads differently
 */
const readTransfers = async (page, spaces) => {
	const ramp = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 0.75, 1];
	/** @type {string[]} */
	const out = [];
	console.log("space          transfer read as the spec's, over its own range");
	for (const space of spaces) {
		const read = await page.evaluate(
			(values, name) => {
				const element = /** @type {HTMLElement} */ (
					document.getElementById("probe")
				);
				return values.map((value) => {
					element.style.color = "black";
					element.style.color = `color(from color(${name} ${value} ${value} ${value}) xyz-d65 x y z)`;
					return getComputedStyle(element).color;
				});
			},
			ramp,
			space
		);
		const transfer =
			/** @type {NonNullable<ReturnType<typeof PREDEFINED_COLOR_SPACES.get>>} */ (
				PREDEFINED_COLOR_SPACES.get(space)
			).transfer;
		/** @type {number[]} */
		const ratios = [];
		for (const [at, text] of read.entries()) {
			const parsed = /^color\(xyz-d65 ([^)]+)\)$/.exec(text);
			if (parsed === null) continue;
			const theirs = Number(parsed[1].split(/\s+/)[1]);
			const mine = transfer(ramp[at]);
			if (mine > 0 && theirs > 0) ratios.push(theirs / mine);
		}
		if (ratios.length === 0) continue;
		const spread = Math.max(...ratios) / Math.min(...ratios);
		// A fifth of a percent sits an order above the ~1e-4 a shared transfer
		// leaves and an order below the 4e-3 a gamma of 2.2 in place of 563/256
		// shows — never mind the 3e-2 of a missing linear segment.
		const differs = spread > 1.002;
		console.log(
			`${space.padEnd(14)} spread ${spread.toFixed(5)}${differs ? "   <- another transfer" : ""}`
		);
		if (differs) out.push(space);
	}
	return out.sort();
};

const main = async () => {
	const random = sequence(24680);
	/** @type {{ space: string, text: string, linear: number[] }[]} */
	const corpus = [];
	// Only the colors the printer would convert at all: one outside the sRGB gamut
	// has no byte to be right or wrong about.
	const inGamut = (/** @type {number[]} */ linear) =>
		linear.every((c) => encode(c) >= -0.002 && encode(c) <= 1.002);
	for (const space of PREDEFINED_COLOR_SPACES.keys()) {
		for (let at = 0; at < SAMPLES; at++) {
			const components = [0, 1, 2].map(() => Number(random().toFixed(6)));
			const linear = ours(space, components);
			if (!inGamut(linear)) continue;
			corpus.push({
				space,
				text: `color(${space} ${components.join(" ")})`,
				linear
			});
		}
	}
	for (const space of POLAR_SPACES) {
		const model =
			/** @type {NonNullable<ReturnType<typeof COLOR_SPACE_MODEL.get>>} */ (
				COLOR_SPACE_MODEL.get(space)
			);
		for (let at = 0; at < SAMPLES; at++) {
			const { text, components } = polarSample(space, random);
			const linear = model.from(components);
			if (!inGamut(linear)) continue;
			corpus.push({ space, text, linear });
		}
	}

	const browser = await launchChrome({ protocolTimeout: 600000 });
	const page = await browser.newPage();
	await page.setContent('<div id="probe">probe</div>');
	const theirs = await readSrgb(
		page,
		corpus.map((sample) => sample.text)
	);

	/** @type {Map<string, { n: number, relative: number, encoded: number, worst: string }>} */
	const stats = new Map();
	for (const [at, sample] of corpus.entries()) {
		const answer = theirs[at];
		if (answer === null) continue;
		const entry = stats.get(sample.space) || {
			n: 0,
			relative: 0,
			encoded: 0,
			worst: ""
		};
		entry.n++;
		const scale = Math.max(...sample.linear.map(Math.abs));
		for (let channel = 0; channel < 3; channel++) {
			const gap = Math.abs(sample.linear[channel] - decode(answer[channel]));
			const relative = scale === 0 ? 0 : gap / scale;
			if (relative > entry.relative) {
				entry.relative = relative;
				entry.worst = sample.text;
			}
			entry.encoded = Math.max(
				entry.encoded,
				Math.abs(encode(sample.linear[channel]) - answer[channel])
			);
		}
		stats.set(sample.space, entry);
	}

	// Which spaces the engine reads through another transfer altogether, swept
	// separately: a matrix difference scales every value by about the same
	// factor, where a different transfer bends the low end of the range away from
	// the rest — so the ratio between what the two compute is what tells them
	// apart, not its size.
	const suspect = await readTransfers(page, [
		...PREDEFINED_COLOR_SPACES.keys()
	]);

	let worstRelative = 0;
	let worstEncoded = 0;
	console.log(
		"\nspace          samples  relative (linear light)  encoded (transfer)"
	);
	for (const [space, entry] of stats) {
		const differs = suspect.includes(space);
		const model = COLOR_SPACE_MODEL.get(space);
		if (!differs) {
			worstRelative = Math.max(worstRelative, entry.relative);
			// Only a space needing no matrix bounds the transfer on its own.
			if (model !== undefined && model.conversion === 1) {
				worstEncoded = Math.max(worstEncoded, entry.encoded);
			}
		}
		console.log(
			`${space.padEnd(14)} ${String(entry.n).padStart(7)}  ${entry.relative
				.toExponential(3)
				.padStart(23)}  ${entry.encoded.toExponential(3).padStart(18)}${
				differs ? "   <- read through another transfer" : ""
			}`
		);
	}

	console.log(
		`\nthe transfer alone is out by up to ${worstEncoded.toExponential(3)}` +
			" in encoded units, and a conversion through a matrix by up to " +
			`${worstRelative.toExponential(3)} of the color's own magnitude.\n` +
			`\nwith the ${HEDGE}x hedge the printer carries:\n` +
			`  _TRANSFER_ERROR   = ${(worstEncoded * HEDGE).toExponential(2)}\n` +
			`  _CONVERSION_ERROR = ${(worstRelative * HEDGE).toExponential(2)}`
	);
	const stated = [...COLOR_SPACE_MODEL]
		.filter(([, space]) => space.conversion === 3)
		.map(([name]) => name)
		.sort();
	console.log(
		`\nspaces read through another transfer: measured ${
			suspect.sort().join(", ") || "none"
		}; stated ${stated.join(", ") || "none"}${
			suspect.join() === stated.join() ? "" : "   <- the generator disagrees"
		}`
	);
	await browser.close();
};

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
