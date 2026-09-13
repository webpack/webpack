/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// Sweep webpack's HTML printer for what a comparison against other minifiers
// cannot see: an output that moves when nothing about the document moved.

//   node tooling/check-html-invariants.js

// Two relations hold for every document: minifying an already-minified page
// changes nothing, and a value's spelling does not decide what it minifies to.

// Both are properties of webpack's own, so nothing is installed or compared to.

// A respelling is lexical: a delimiter, a character reference, a name's case.
// Each is checked against the tokenizer, so one that moved the document is dropped.

// Whitespace inside a tag is deliberately not one of them: a tag nothing beats
// is echoed as written, so respelling that would report a decision as a defect.

// That echo is also why the report is read rather than counted: a tag the
// printer declines whole carries the source's spelling into the output by design.

// A finding is bisected down to the attributes that carry it and re-run on the
// enclosing tag alone, so the report names a repro rather than a fixture.

// `FIXTURE=`, `RELATION=`, `PRESET=` and `SPELLING=` narrow a run to rows whose
// name contains what they name.

const fs = require("fs");
const path = require("path");

const {
	QUOTE_NONE,
	SourceProcessor,
	decodeEntities,
	pickTransforms,
	tokenize
} = require("../lib/html/syntax");
const {
	APP_SHELL,
	CACHE,
	INLINED_STYLESHEETS,
	INSTALLED_DOCUMENTS,
	inlineCssPage
} = require("./compare-html-tools");
const { filterFrom, log } = require("./compare-tools-harness");

const ROOT = path.resolve(__dirname, "..");
const FIXTURES = path.join(ROOT, "test");
const MODULES = path.join(CACHE, "node_modules");

// A web-platform-tests checkout, which the html5lib job alone fetches: its
// thousands of documents are a corpus of their own rather than a default run.
const SKIPPED_FIXTURE_DIRS = new Set(["node_modules", "wpt"]);

// Each bisection step minifies the whole document twice, so a page carrying
// thousands of attributes stops shrinking rather than holding up the report.
const SHRINK_BUDGET = 40;

/** @typedef {import("../lib/html/syntax").HtmlPrintOptions} HtmlPrintOptions */

// No renderer is attached, so an embedded body stays as written: the CSS
// minifier's own fixed point would read as a finding of this printer's.
/** @type {[string, HtmlPrintOptions][]} */
const PRESETS = [
	["default", {}],
	[
		"aggressive",
		{
			collapseWhitespace: "all",
			mergeStyles: true,
			removeEmptyAttributes: true,
			removeEmptyElements: true,
			removeRedundantAttributes: "all",
			sortAttributes: true,
			sortTokenLists: true,
			removeImpliedTags: true
		}
	]
];

/**
 * @param {HtmlPrintOptions} options one preset's minimizer options
 * @returns {(html: string) => string} the printer those options name
 */
const printerFor = (options) => {
	const printOptions = {
		mode: /** @type {"minify"} */ ("minify"),
		transforms: pickTransforms(options),
		...options
	};
	return (html) =>
		/** @type {{ code: string }} */ (
			new SourceProcessor().process(html, printOptions)
		).code;
};

/**
 * @typedef {object} Site
 * @property {number} start where the attribute's `name=value` text begins
 * @property {number} end where it ends, past a closing delimiter
 * @property {string} name the name as the source spelled it
 * @property {string} value its value, decoded
 * @property {number} tagStart the enclosing open tag's start
 * @property {number} tagEnd its end, past the `>`
 */

/**
 * Where the tokenizer reads on from after an attribute: the state machine's own
 * answer, which a callback replaces by returning one of its own.
 * @param {number} valueStart value start, or -1 for a valueless attribute
 * @param {number} valueEnd value end
 * @param {number} nameEnd name end
 * @param {number} quoteType which delimiter the source used
 * @returns {number} the position to read on from
 */
const afterAttribute = (valueStart, valueEnd, nameEnd, quoteType) => {
	if (valueStart === -1) return nameEnd;
	return quoteType === QUOTE_NONE ? valueEnd : valueEnd + 1;
};

/**
 * Every attribute the tokenizer reports, with the open tag holding it. A close
 * tag's attributes are dropped by the tree builder, so they are dropped here.
 * @param {string} html a document
 * @returns {Site[]} the sites, in source order
 */
const attributeSites = (html) => {
	/** @type {Site[]} */
	const sites = [];
	/** @type {Site[]} */
	let pending = [];
	tokenize(html, 0, {
		attribute: (input, nameStart, nameEnd, valueStart, valueEnd, quoteType) => {
			const end = afterAttribute(valueStart, valueEnd, nameEnd, quoteType);
			pending.push({
				start: nameStart,
				end,
				name: input.slice(nameStart, nameEnd),
				value:
					valueStart === -1
						? ""
						: decodeEntities(input.slice(valueStart, valueEnd), true),
				tagStart: -1,
				tagEnd: -1
			});
			return end;
		},
		openTag: (input, start, end) => {
			for (const site of pending) {
				site.tagStart = start;
				site.tagEnd = end;
				sites.push(site);
			}
			pending = [];
			return end;
		},
		closeTag: (input, start, end) => {
			pending = [];
			return end;
		}
	});
	return sites;
};

/**
 * What a document says, as a flat token stream: names folded to lower case and
 * values decoded, so two spellings of one document read identically. Text is
 * decoded wherever it is written, which understates a difference inside a
 * `<script>` rather than reporting an escaping change as a changed document.
 * @param {string} html a document
 * @returns {string} its stream, as the JSON of every token in order
 */
const tokenStream = (html) => {
	/** @type {string[]} */
	const out = [];
	tokenize(html, 0, {
		openTag: (input, start, end, nameStart, nameEnd, selfClosing) => {
			const name = input.slice(nameStart, nameEnd).toLowerCase();
			out.push(`<${name}${selfClosing ? "/" : ""}`);
			return end;
		},
		closeTag: (input, start, end, nameStart, nameEnd) => {
			out.push(`</${input.slice(nameStart, nameEnd).toLowerCase()}`);
			return end;
		},
		attribute: (input, nameStart, nameEnd, valueStart, valueEnd, quoteType) => {
			const name = input.slice(nameStart, nameEnd).toLowerCase();
			const value =
				valueStart === -1
					? ""
					: decodeEntities(input.slice(valueStart, valueEnd), true);
			out.push(` ${name}=${value}`);
			return afterAttribute(valueStart, valueEnd, nameEnd, quoteType);
		},
		text: (input, start, end) => {
			out.push(decodeEntities(input.slice(start, end), false));
			return end;
		},
		comment: (input, start, end, dataStart, dataEnd) => {
			out.push(`<!--${input.slice(dataStart, dataEnd)}`);
			return end;
		},
		doctype: (input, start, end, nameStart, nameEnd) => {
			const name =
				nameStart === -1 ? "" : input.slice(nameStart, nameEnd).toLowerCase();
			out.push(`<!doctype ${name}`);
			return end;
		}
	});
	return JSON.stringify(out);
};

const AMPERSAND = /&/g;
const QUOTATION_MARK = /"/g;
const APOSTROPHE = /'/g;
// The characters the unquoted attribute value state ends on or rejects.
const BARE_UNSAFE = /[\t\n\f\r "'=<>`]/;
const ASCII_NAME = /^[a-z][a-z0-9-]*$/;

/**
 * @param {string} value a decoded value
 * @returns {boolean} whether it holds a C0 control character
 */
const hasControl = (value) => {
	for (const character of value) {
		if (/** @type {number} */ (character.codePointAt(0)) < 0x20) return true;
	}
	return false;
};

/**
 * @param {string} value a decoded value
 * @param {string} delimiter the delimiter it will be written in
 * @returns {string} the value as that delimiter's contents
 */
const escapeQuoted = (value, delimiter) => {
	const escaped = value.replace(AMPERSAND, "&amp;");
	return delimiter === '"'
		? escaped.replace(QUOTATION_MARK, "&#34;")
		: escaped.replace(APOSTROPHE, "&#39;");
};

/**
 * @param {string} value a decoded value
 * @returns {string | null} the value with no delimiter, or null where it needs one
 */
const bareValue = (value) => {
	if (value === "") return null;
	const escaped = value.replace(AMPERSAND, "&amp;");
	// A trailing `/` would fuse with the tag's `>` into a self-closing flag.
	if (BARE_UNSAFE.test(escaped) || escaped.endsWith("/")) return null;
	return escaped;
};

/**
 * @param {string} value a decoded value
 * @returns {string | null} every character of it as a numeric reference
 */
const asReferences = (value) => {
	// A reference bypasses the preprocessor, so an encoded CR would survive where
	// a written one is folded to LF — a different value, not a respelling of one.
	if (value === "" || hasControl(value)) return null;
	let out = "";
	for (const character of value) {
		const code = /** @type {number} */ (character.codePointAt(0));
		out += `&#x${code.toString(16)};`;
	}
	return out;
};

/**
 * @typedef {object} Respelling
 * @property {string} name how the row is labelled
 * @property {(site: Site, html: string) => string | null} write the attribute's new source text, or null to leave it alone
 * @property {((html: string) => boolean)=} skips whether a document is out of this respelling's reach
 */

/** @type {Respelling[]} */
const RESPELLINGS = [
	{
		name: "quote-double",
		write: (site) => `${site.name}="${escapeQuoted(site.value, '"')}"`
	},
	{
		name: "quote-single",
		write: (site) => `${site.name}='${escapeQuoted(site.value, "'")}'`
	},
	{
		name: "unquote",
		write: (site) => {
			const bare = bareValue(site.value);
			return bare === null ? null : `${site.name}=${bare}`;
		}
	},
	{
		name: "references",
		write: (site) => {
			const referenced = asReferences(site.value);
			return referenced === null ? null : `${site.name}="${referenced}"`;
		}
	},
	{
		// An attribute name is matched case-insensitively in the HTML namespace
		// only, so a document carrying foreign content is left alone whole.
		name: "name-case",
		skips: (html) => /<\s*(?:svg|math)[\s/>]/i.test(html),
		write: (site, html) =>
			ASCII_NAME.test(site.name)
				? `${site.name.toUpperCase()}${html.slice(
						site.start + site.name.length,
						site.end
					)}`
				: null
	}
];

/**
 * @param {string} html a document
 * @param {Site[]} sites the sites to respell
 * @param {Respelling} respelling how to respell them
 * @returns {string} the document, respelled
 */
const respell = (html, sites, respelling) => {
	let out = "";
	let read = 0;
	for (const site of sites) {
		const written = respelling.write(site, html);
		if (written === null) continue;
		out += html.slice(read, site.start) + written;
		read = site.end;
	}
	return out + html.slice(read);
};

// `bytes` is one output longer than the other, `differs` the two saying different
// things — which a missed boolean collapse reads as, not a worse defect than it.
/** @typedef {{ kind: "differs" | "bytes" | "throws", delta: number, mutated: string, note: string }} Finding */

/**
 * @param {EXPECTED_ANY} error what a printer threw, which can be any value
 * @returns {string} the first line of what it says
 */
const thrownText = (error) => {
	const said =
		error && /** @type {Error} */ (error).message
			? /** @type {Error} */ (error).message
			: error;
	return String(said).split("\n", 1)[0];
};

/**
 * Whether respelling these sites moved the output, and how. An output of the
 * same length saying the same thing is not a finding: webpack keeps the source's
 * spelling where nothing beats it, so a delimiter survives on purpose.
 * @param {(html: string) => string} minify the printer under test
 * @param {string} html a document
 * @param {string} minified what it minifies to
 * @param {Site[]} sites the sites to respell
 * @param {Respelling} respelling how to respell them
 * @returns {Finding | null} what moved, or null
 */
const spellingFinding = (minify, html, minified, sites, respelling) => {
	const mutated = respell(html, sites, respelling);
	if (mutated === html) return null;
	// Verified against the tokenizer rather than argued for: a respelling that
	// moved the document is dropped instead of reported.
	if (tokenStream(mutated) !== tokenStream(html)) return null;
	/** @type {string} */
	let answer;
	try {
		answer = minify(mutated);
	} catch (error) {
		return {
			kind: "throws",
			delta: 0,
			mutated,
			note: thrownText(error)
		};
	}
	if (answer === minified) return null;
	const says = tokenStream(answer) !== tokenStream(minified);
	if (!says && answer.length === minified.length) return null;
	return {
		kind: says ? "differs" : "bytes",
		delta: answer.length - minified.length,
		mutated,
		note: ""
	};
};

/**
 * Bisect a finding down to the sites that carry it. Where neither half keeps it
 * the sites interact, and what is left stands as the report's repro.
 * @param {(sites: Site[]) => Finding | null} holds whether a subset still shows it
 * @param {Site[]} sites every respelled site
 * @param {string} kind the kind to keep
 * @returns {Site[]} the smallest subset found
 */
const shrink = (holds, sites, kind) => {
	let current = sites;
	let budget = SHRINK_BUDGET;
	while (current.length > 1 && budget > 0) {
		const half = Math.ceil(current.length / 2);
		const left = current.slice(0, half);
		const right = current.slice(half);
		budget -= 2;
		const keptLeft = holds(left);
		if (keptLeft !== null && keptLeft.kind === kind) {
			current = left;
			continue;
		}
		const keptRight = holds(right);
		if (keptRight !== null && keptRight.kind === kind) {
			current = right;
			continue;
		}
		break;
	}
	return current;
};

/**
 * The enclosing tag on its own, where the finding survives being cut out of the
 * page — which is the whole of a repro someone can paste into a test.
 * @param {(html: string) => string} minify the printer under test
 * @param {string} html a document
 * @param {Site[]} sites the sites the finding shrank to
 * @param {Respelling} respelling how they are respelled
 * @returns {{ source: string, minified: string, mutated: string, answer: string } | null} the repro, or null where the page carries it
 */
const reproduce = (minify, html, sites, respelling) => {
	const { tagStart, tagEnd } = sites[0];
	if (sites.some((site) => site.tagStart !== tagStart)) return null;
	const source = html.slice(tagStart, tagEnd);
	// The slice carries the tag's other attributes too, and respelling those
	// would report the whole tag where the bisection named one attribute.
	const blamed = new Set(sites.map((site) => site.start - tagStart));
	try {
		const minified = minify(source);
		const found = spellingFinding(
			minify,
			source,
			minified,
			attributeSites(source).filter((site) => blamed.has(site.start)),
			respelling
		);
		if (found === null) return null;
		return {
			source,
			minified,
			mutated: found.mutated,
			answer: minify(found.mutated)
		};
	} catch (_error) {
		return null;
	}
};

/**
 * @param {string} text any text
 * @param {number} limit how much of it to keep
 * @returns {string} it on one line, cut to the limit
 */
const oneLine = (text, limit) => {
	let shown = "";
	for (const character of text) {
		const code = /** @type {number} */ (character.codePointAt(0));
		// Tab, LF, FF and CR are left to the whitespace collapse below; every
		// other control character is shown, since holding one is some findings.
		shown +=
			code > 0x1f ||
			code === 0x9 ||
			code === 0xa ||
			code === 0xc ||
			code === 0xd
				? character
				: `\\x${code.toString(16).padStart(2, "0")}`;
	}
	const flat = shown.replace(/\s+/g, " ").trim();
	return flat.length > limit ? `${flat.slice(0, limit - 1)}…` : flat;
};

/**
 * @param {number} delta a byte difference
 * @returns {string} it signed
 */
const signed = (delta) => `${delta > 0 ? "+" : ""}${delta} B`;

/**
 * @param {string} before one text
 * @param {string} after another
 * @returns {number} the first index they differ at
 */
const firstDifference = (before, after) => {
	const shortest = Math.min(before.length, after.length);
	for (let i = 0; i < shortest; i++) {
		if (before.charCodeAt(i) !== after.charCodeAt(i)) return i;
	}
	return shortest;
};

/**
 * The tag in the output a difference falls inside, minified on its own. It is a
 * repro only where minifying that tag alone moves it too.
 * @param {(html: string) => string} minify the printer under test
 * @param {string} minified one pass's output
 * @param {number} at where the second pass first differs
 * @returns {{ source: string, again: string } | null} the repro, or null
 */
const idempotenceRepro = (minify, minified, at) => {
	let found = "";
	tokenize(minified, 0, {
		openTag: (input, start, end) => {
			if (start <= at && at < end) found = input.slice(start, end);
			return end;
		}
	});
	if (found === "") return null;
	try {
		const again = minify(found);
		return again === found ? null : { source: found, again };
	} catch (_error) {
		return null;
	}
};

/**
 * Every fixture of one extension below a directory.
 * @param {string} dir directory to walk
 * @param {string} extension file extension including the dot
 * @returns {string[]} sorted fixture paths
 */
const collect = (dir, extension) => {
	/** @type {string[]} */
	const files = [];
	/**
	 * @param {string} current directory to read
	 * @returns {void}
	 */
	const walk = (current) => {
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			if (entry.isDirectory()) {
				if (SKIPPED_FIXTURE_DIRS.has(entry.name)) continue;
				walk(path.join(current, entry.name));
			} else if (entry.name.endsWith(extension)) {
				files.push(path.join(current, entry.name));
			}
		}
	};
	walk(dir);
	return files.sort();
};

/**
 * The repo's own HTML fixtures, which are the shapes the printer exists for,
 * plus the comparison's documents wherever its cache holds them.
 * @returns {[string, string][]} `[label, html]` for every fixture
 */
const fixtures = () => {
	/** @type {[string, string][]} */
	const out = [];
	for (const file of collect(FIXTURES, ".html")) {
		out.push([
			path.relative(ROOT, file).replace(/\\/g, "/"),
			fs.readFileSync(file, "utf8")
		]);
	}
	out.push(["App shell (inline critical CSS)", APP_SHELL]);
	for (const [label, file] of INSTALLED_DOCUMENTS) {
		const full = path.join(MODULES, file);
		if (fs.existsSync(full)) out.push([label, fs.readFileSync(full, "utf8")]);
	}
	for (const [label, file] of INLINED_STYLESHEETS) {
		const full = path.join(MODULES, file);
		if (fs.existsSync(full)) {
			out.push([label, inlineCssPage(label, fs.readFileSync(full, "utf8"))]);
		}
	}
	return out;
};

const wantedFixture = filterFrom("FIXTURE");
const wantedPreset = filterFrom("PRESET");
const wantedRelation = filterFrom("RELATION");
const wantedSpelling = filterFrom("SPELLING");

/** @typedef {{ relation: string, what: string, repro: string }} Report */

/**
 * Every respelling this document's output depends on.
 * @param {(html: string) => string} minify the printer under test
 * @param {string} html the document
 * @param {string} minified what it minifies to
 * @returns {Report[]} what moved, and the smallest repro found for each
 */
const sweepRespellings = (minify, html, minified) => {
	/** @type {Report[]} */
	const reports = [];
	if (!wantedRelation("respelling")) return reports;
	const sites = attributeSites(html);
	for (const respelling of RESPELLINGS.filter((one) =>
		wantedSpelling(one.name)
	)) {
		if (respelling.skips !== undefined && respelling.skips(html)) continue;
		/**
		 * @param {Site[]} subset the sites to respell
		 * @returns {Finding | null} what moved
		 */
		const holds = (subset) =>
			spellingFinding(minify, html, minified, subset, respelling);
		const found = holds(sites);
		if (found === null) continue;
		const carried =
			found.kind === "throws" ? sites : shrink(holds, sites, found.kind);
		// Read off the sites that were kept, so the byte count is the repro's and
		// not every respelled attribute's added up.
		const blamed = (carried === sites ? found : holds(carried)) || found;
		const repro =
			blamed.kind === "throws"
				? null
				: reproduce(minify, html, carried, respelling);
		reports.push({
			relation: `respelling ${respelling.name}`,
			what:
				blamed.kind === "throws"
					? `threw: ${blamed.note}`
					: `${blamed.kind}, ${signed(blamed.delta)}`,
			repro:
				repro === null
					? `    ${oneLine(html.slice(carried[0].tagStart, carried[0].tagEnd), 80)}   (only in the page)`
					: `    ${oneLine(repro.source, 76)}  ->  ${oneLine(repro.minified, 76)}\n    ${oneLine(repro.mutated, 76)}  ->  ${oneLine(repro.answer, 76)}`
		});
	}
	return reports;
};

/**
 * Every invariant this document breaks under one preset.
 * @param {(html: string) => string} minify the printer under test
 * @param {string} html the document
 * @returns {Report[]} what moved, and the smallest repro found for each
 */
const sweepDocument = (minify, html) => {
	/** @type {Report[]} */
	const reports = [];
	/** @type {string} */
	let minified;
	try {
		minified = minify(html);
	} catch (error) {
		return [
			{
				relation: "minify",
				what: "threw",
				repro: `    ${thrownText(error)}`
			}
		];
	}
	if (wantedRelation("idempotence")) {
		/** @type {string} */
		let again;
		try {
			again = minify(minified);
		} catch (error) {
			// A printer that reads its own output back and throws is the strongest
			// finding here, so it is reported rather than ending the sweep.
			return [
				{
					relation: "idempotence",
					what: "threw",
					repro: `    ${thrownText(error)}`
				},
				...sweepRespellings(minify, html, minified)
			];
		}
		if (again !== minified) {
			const kind =
				tokenStream(again) === tokenStream(minified) ? "bytes" : "differs";
			const at = firstDifference(minified, again);
			const repro = idempotenceRepro(minify, minified, at);
			reports.push({
				relation: "idempotence",
				what: `${kind}, ${signed(again.length - minified.length)}`,
				repro:
					repro === null
						? `    ${oneLine(minified.slice(at, at + 70), 70)}\n      -> ${oneLine(again.slice(at, at + 70), 70)}`
						: `    ${oneLine(repro.source, 80)}\n      -> ${oneLine(repro.again, 80)}`
			});
		}
	}
	return [...reports, ...sweepRespellings(minify, html, minified)];
};

/**
 * The report, grouped by the repro rather than by the document: one printer
 * defect reaches hundreds of pages, and is one thing to fix.
 * @param {(text: string) => void} write receives the report
 * @returns {number} how many distinct findings it named
 */
const main = (write) => {
	const corpus = fixtures().filter(([label]) => wantedFixture(label));
	const presets = PRESETS.filter(([name]) => wantedPreset(name));
	log(`sweeping ${corpus.length} documents under ${presets.length} presets …`);
	/** @type {Map<string, { report: Report, presets: Set<string>, documents: Set<string> }>} */
	const groups = new Map();
	for (const [label, html] of corpus) {
		for (const [preset, options] of presets) {
			for (const report of sweepDocument(printerFor(options), html)) {
				const key = JSON.stringify([
					report.relation,
					report.what,
					report.repro
				]);
				const group = groups.get(key);
				if (group === undefined) {
					groups.set(key, {
						report,
						presets: new Set([preset]),
						documents: new Set([label])
					});
					continue;
				}
				group.presets.add(preset);
				group.documents.add(label);
			}
		}
	}
	const ordered = [...groups.values()].sort(
		(a, b) => b.documents.size - a.documents.size
	);
	for (const group of ordered) {
		const { relation, what, repro } = group.report;
		const documents = [...group.documents];
		const reach =
			documents.length === 1
				? documents[0]
				: `${documents.length} documents, from ${documents[0]}`;
		write(
			`\n${relation} — ${what}\n${repro}\n    [${[...group.presets].join(
				", "
			)}] ${reach}\n`
		);
	}
	return ordered.length;
};

module.exports.RESPELLINGS = RESPELLINGS;
module.exports.attributeSites = attributeSites;
module.exports.fixtures = fixtures;
module.exports.main = main;
module.exports.oneLine = oneLine;
module.exports.respell = respell;
module.exports.sweepDocument = sweepDocument;
module.exports.tokenStream = tokenStream;

if (require.main === module) {
	const found = main((text) => process.stdout.write(text));
	log(`\n${found} finding${found === 1 ? "" : "s"}`);
	process.exitCode = found > 0 ? 1 : 0;
}
