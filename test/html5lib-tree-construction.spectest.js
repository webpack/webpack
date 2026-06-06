"use strict";

// cspell:ignore selectedcontent domjs

// Runs the html5lib tree-construction conformance suite against buildHtmlAst:
// each case's expected tree is compared to the serialized AST in the html5lib
// "| "-prefixed format. The corpus is an optional git submodule
// (test/html5lib-tests); when absent the suite degrades to a single no-op.
//
// A small set of cases is knowingly divergent (KNOWN_DIVERGENCES below). They
// fall into three buckets:
//  1. walkHtmlTokens deliberately emits a partial tag at EOF instead of the
//     spec's per-character fallback, so truncated rawtext/script end tags
//     (`<script></S`) keep different text. This trade-off is better for
//     webpack's incremental/offset use and is intentionally not "fixed" here.
//  2. The foreign-content breakout for stray HTML `</p>`/`</br>` end tags.
//  3. A handful of adversarial fragment/`selectedcontent`/`<`-in-tag-name edge
//     cases not modelled by this builder.
// Each is asserted to *still* diverge, so accidentally fixing one flags the
// list as stale rather than silently passing.

const fs = require("fs");
const path = require("path");
const buildHtmlAst = require("../lib/html/buildHtmlAst");
const { decodeHtmlEntities } = require("../lib/html/walkHtmlTokens");

const dir = path.resolve(__dirname, "./html5lib-tests/tree-construction");

const NS_PREFIX = {
	[buildHtmlAst.NS_SVG]: "svg ",
	[buildHtmlAst.NS_MATHML]: "math "
};

const KNOWN_DIVERGENCES = new Set([
	// 1. tokenizer partial-tag-at-EOF (rawtext/script/RCDATA) — see header.
	"tests16.dat #9",
	"tests16.dat #16",
	"tests16.dat #27",
	"tests16.dat #44",
	"tests16.dat #57",
	"tests16.dat #108",
	"tests16.dat #115",
	"tests16.dat #126",
	"tests16.dat #143",
	"tests16.dat #154",
	"tests2.dat #18",
	"webkit02.dat #4",
	// 2. foreign-content breakout for stray `</p>` / `</br>`.
	"tests26.dat #16",
	"tests26.dat #17",
	"foreign-fragment.dat #59",
	"foreign-fragment.dat #60",
	// 3. adversarial fragment / selectedcontent / `<`-in-tag-name edges.
	"domjs-unsafe.dat #36",
	"foreign-fragment.dat #61",
	"foreign-fragment.dat #62",
	"noscript01.dat #14",
	"tests26.dat #18",
	"tests26.dat #19",
	"tests_innerHTML_1.dat #76",
	"tests_innerHTML_1.dat #77",
	"webkit01.dat #3",
	"webkit02.dat #18",
	"webkit02.dat #44",
	"webkit02.dat #45",
	"webkit02.dat #46",
	"webkit02.dat #47",
	"webkit02.dat #48"
]);

/**
 * Serialize an AST in the html5lib tree-construction format.
 * @param {import("../lib/html/buildHtmlAst").HtmlDocument} doc document
 * @returns {string} serialized tree
 */
const serialize = (doc) => {
	const lines = [];
	/**
	 * @param {import("../lib/html/buildHtmlAst").HtmlNode} node node
	 * @param {number} depth depth
	 */
	const walk = (node, depth) => {
		const indent = `| ${"  ".repeat(depth)}`;
		if (node.type === "doctype") {
			let s = `<!DOCTYPE ${node.name || ""}`;
			if (node.publicId !== null || node.systemId !== null) {
				s += ` "${node.publicId || ""}" "${node.systemId || ""}"`;
			}
			lines.push(`${indent}${s}>`);
			return;
		}
		if (node.type === "comment") {
			lines.push(`${indent}<!-- ${node.data} -->`);
			return;
		}
		if (node.type === "text") {
			lines.push(`${indent}"${node.data}"`);
			return;
		}
		const prefix = NS_PREFIX[node.namespace] || "";
		lines.push(`${indent}<${prefix}${node.tagName}>`);
		const attrs = [...node.attributes].sort((a, b) => {
			const an = a.serializedName || a.name;
			const bn = b.serializedName || b.name;
			return an < bn ? -1 : an > bn ? 1 : 0;
		});
		for (const a of attrs) {
			lines.push(
				`| ${"  ".repeat(depth + 1)}${a.serializedName || a.name}="${decodeHtmlEntities(a.value, true)}"`
			);
		}
		if (node.templateContent) {
			lines.push(`| ${"  ".repeat(depth + 1)}content`);
			for (const c of node.templateContent.children) walk(c, depth + 2);
			return;
		}
		for (const c of node.children) walk(c, depth + 1);
	};
	for (const c of doc.children) walk(c, 0);
	return lines.join("\n");
};

/**
 * Parse a html5lib `.dat` file into test cases.
 * @param {string} text file content
 * @returns {{ data: string, document: string | null, fragment: string | null, scriptMode: string | null }[]} cases
 */
const parseDat = (text) => {
	const cases = [];
	const lines = text.split("\n");
	let i = 0;
	const n = lines.length;
	const readSection = () => {
		i++;
		const out = [];
		while (i < n && !lines[i].startsWith("#")) {
			out.push(lines[i]);
			i++;
		}
		return out;
	};
	while (i < n) {
		if (lines[i] !== "#data") {
			i++;
			continue;
		}
		const test = {
			data: "",
			document: null,
			fragment: null,
			scriptMode: null
		};

		test.data = readSection().join("\n");

		while (i < n && lines[i].startsWith("#") && lines[i] !== "#data") {
			const tag = lines[i];
			if (tag === "#document-fragment") {
				test.fragment = readSection().join("\n").trim();
			} else if (tag === "#script-on") {
				test.scriptMode = "on";

				i++;
			} else if (tag === "#script-off") {
				test.scriptMode = "off";

				i++;
			} else if (tag === "#document") {
				i++;
				const doc = [];
				while (i < n) {
					if (lines[i] === "" && (i + 1 >= n || lines[i + 1] === "#data")) {
						i++;
						break;
					}
					doc.push(lines[i]);
					i++;
				}
				while (doc.length && doc[doc.length - 1] === "") doc.pop();

				test.document = doc.join("\n");
			} else {
				readSection();
			}
		}
		cases.push(test);
	}
	return cases;
};

/**
 * @param {{ data: string, fragment: string | null }} c case
 * @returns {string} serialized tree
 */
const run = (c) => {
	const doc = buildHtmlAst(c.data, c.fragment || undefined);
	// In fragment mode the result is the children of the synthesized root.
	const root =
		c.fragment && doc.children[0]
			? /** @type {import("../lib/html/buildHtmlAst").HtmlDocument} */ ({
					type: "document",
					children:
						/** @type {import("../lib/html/buildHtmlAst").HtmlElement} */ (
							doc.children[0]
						).children
				})
			: doc;
	return serialize(root);
};

const hasCorpus = fs.existsSync(dir) && fs.readdirSync(dir).length > 0;

describe("html5lib tree-construction", () => {
	if (!hasCorpus) {
		it("submodule not initialized (run `git submodule update --init test/html5lib-tests`)", () => {
			// No-op: the conformance data is an optional git submodule.
		});

		return;
	}

	for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".dat"))) {
		describe(file, () => {
			const cases = parseDat(fs.readFileSync(path.join(dir, file), "utf8"));
			for (const [index, c] of cases.entries()) {
				const id = `${file} #${index}`;
				// Scripting is disabled in webpack; skip script-required cases and
				// cases without an expected tree.
				if (c.scriptMode === "on" || c.document === null) {
					continue;
				}
				if (KNOWN_DIVERGENCES.has(id)) {
					it(`${id} (known divergence)`, () => {
						expect(run(c)).not.toBe(c.document);
					});

					continue;
				}

				it(id, () => {
					expect(run(c)).toBe(c.document);
				});
			}
		});
	}
});
