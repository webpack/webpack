import { mulberry32, randomInt } from "./prng.mjs";

/**
 * Deterministic source-text generators for parser/tokenizer benchmarks and
 * generated e2e projects. All output depends only on the arguments.
 */

/**
 * @param {number} index chunk index, varies the identifiers
 * @returns {string} a paragraph of varied JavaScript
 */
function javaScriptParagraph(index) {
	const i = index;
	return `
const value${i} = { a: ${i}, b: "str${i}", c: [${i}, ${i + 1}, ${
		i + 2
	}], d: null };
let counter${i} = ${i};
function helper${i}(arg, { opt = ${i}, ...rest } = {}) {
	const mapped = arg.map((x) => x * opt + counter${i});
	try {
		for (const item of mapped) {
			if (item % 2 === 0) counter${i} += item;
			else counter${i} -= item | 0;
		}
	} catch (err) {
		throw new Error(\`helper${i} failed: \${err.message}\`, { cause: err });
	}
	return { mapped, rest };
}
class Thing${i} {
	#hidden = ${i};
	static instances = 0;
	constructor(name = "thing${i}") {
		this.name = name;
		Thing${i}.instances++;
	}
	get id() {
		return \`\${this.name}-\${this.#hidden}\`;
	}
	async load() {
		const result = await Promise.resolve(helper${i}([${i}, ${i * 2}, ${i * 3}]));
		switch (result.mapped.length) {
			case 0:
				return null;
			case 3:
				return result.mapped;
			default:
				return result;
		}
	}
}
const arrow${i} = (a, b) => (a > b ? { ...value${i}, a } : [a ?? b, b?.toString()]);
export const exported${i} = arrow${i}(counter${i}, ${i}) && new Thing${i}();
`;
}

/**
 * @param {number} paragraphs number of paragraphs (~1.2 KiB each)
 * @param {boolean=} asModule include import/export syntax
 * @returns {string} JavaScript source
 */
export function generateJavaScriptSource(paragraphs, asModule = true) {
	const parts = [];
	if (!asModule) {
		parts.push('"use strict";\n');
	}
	for (let i = 0; i < paragraphs; i++) {
		const paragraph = javaScriptParagraph(i);
		parts.push(asModule ? paragraph : paragraph.replace(/^export /gm, ""));
	}
	return parts.join("\n// section separator\n");
}

const CSS_UNITS = ["px", "em", "rem", "%", "vh", "vw"];
const CSS_PROPS = [
	"margin",
	"padding",
	"width",
	"height",
	"top",
	"left",
	"font-size",
	"line-height",
	"border-radius",
	"gap"
];
const CSS_COLORS = ["#f00", "#00ff00", "rgba(0, 0, 0, 0.5)", "currentColor"];

/**
 * @param {number} rules number of rules
 * @param {boolean=} asModule generate CSS Modules flavored selectors (local classes)
 * @returns {string} CSS source
 */
export function generateCssSource(rules, asModule = false) {
	const random = mulberry32(rules * 31 + (asModule ? 1 : 0));
	const parts = [":root { --main-color: #336699; --spacing: 8px; }\n"];
	for (let i = 0; i < rules; i++) {
		const cls = `item-${i}`;
		const selector = asModule
			? `.${cls}`
			: i % 7 === 0
				? `.${cls}:hover > .child, .${cls}::after`
				: i % 5 === 0
					? `#id-${i} .${cls}[data-state="on"]`
					: `.${cls}`;
		const declarations = [];
		const count = 2 + (i % 4);
		for (let d = 0; d < count; d++) {
			const prop = CSS_PROPS[randomInt(random, 0, CSS_PROPS.length)];
			const unit = CSS_UNITS[randomInt(random, 0, CSS_UNITS.length)];
			declarations.push(`\t${prop}: ${randomInt(random, 0, 100)}${unit};`);
		}
		declarations.push(
			`\tcolor: ${CSS_COLORS[i % CSS_COLORS.length]};`,
			'\tbackground: url("data:image/gif;base64,R0lGODlhAQABAAAAACw=") no-repeat;',
			"\tmax-width: calc(100% - var(--spacing) * 2);"
		);
		parts.push(`${selector} {\n${declarations.join("\n")}\n}`);
		if (i % 11 === 0) {
			parts.push(
				`@media (min-width: ${600 + i}px) {\n\t.${cls} { display: flex; }\n}`
			);
		}
	}
	return parts.join("\n\n");
}

/**
 * @param {number} sections number of sections
 * @returns {string} HTML document source
 */
export function generateHtmlSource(sections) {
	const parts = [
		"<!DOCTYPE html>",
		'<html lang="en">',
		"<head>",
		'<meta charset="utf-8">',
		"<title>Benchmark fixture</title>",
		'<link rel="stylesheet" href="./styles.css">',
		"</head>",
		"<body>"
	];
	for (let i = 0; i < sections; i++) {
		parts.push(
			`<!-- section ${i} -->`,
			`<section id="section-${i}" class="block b-${i % 13}" data-index="${i}">`,
			`<h2>Section &amp; heading ${i}</h2>`,
			`<p>Some <strong>rich</strong> <em>text</em> with an <a href="/page/${i}?a=1&amp;b=2">anchor</a>.</p>`,
			"<ul>",
			`<li>first ${i}</li><li>second ${i}</li><li>third ${i}</li>`,
			"</ul>",
			`<table><tr><td>${i}</td><td>${i * 2}</td></tr><tr><td colspan="2">${
				i * 3
			}</td></tr></table>`,
			`<img src="./image-${i % 5}.png" alt="img ${i}" width="10" height="10">`,
			i % 6 === 0
				? `<template><div class="tpl">${i}</div></template>`
				: `<div><br><input type="text" value="v${i}" disabled></div>`,
			"</section>"
		);
	}
	parts.push('<script>console.log("end");</script>', "</body>", "</html>");
	return parts.join("\n");
}
