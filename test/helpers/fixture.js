"use strict";

const fs = require("fs");
const path = require("path");
const { namedRenderer } = require("./embeddedRenderers");

const FIXTURES = path.join(__dirname, "..", "fixtures");

/** @typedef {"css" | "html" | "javascript" | "xml"} FixtureLanguage */

/** @type {Map<string, string>} */
const cache = new Map();

/**
 * @param {FixtureLanguage} lang a fixture language
 * @returns {string} the file name its inputs are kept under
 */
const indexFile = (lang) =>
	lang === "javascript" ? "index.js" : `index.${lang}`;

/**
 * One unit-test input, kept once under `test/fixtures/<lang>/<name>/`.
 * @param {FixtureLanguage} lang the language the input is written in
 * @param {string} name the fixture directory
 * @returns {string} the input
 */
const fixture = (lang, name) => {
	const file = path.join(FIXTURES, lang, name, indexFile(lang));
	let source = cache.get(file);
	if (source === undefined) {
		source = fs.readFileSync(file, "utf8");
		cache.set(file, source);
	}
	return source;
};

/**
 * A relation a fixture is allowed to break, with why it is owed nothing.
 * @typedef {object} KnownDifference
 * @property {string} relation the relation, as a finding names it
 * @property {string} contains text the finding's repro holds
 * @property {string} why the reason, read by whoever meets the entry later
 */

/** @typedef {{ mode: "minify" | "beautify", xml?: boolean }} PrintOptionSet */

/**
 * One call a fixture's `parse.json` asks the runner to make and snapshot, on
 * top of the tokens and parse every fixture gets.
 * @typedef {object} ParseRun
 * @property {string=} entry the public entry point, by the name the language's runner lists it under; its document parse where absent
 * @property {Record<string, EXPECTED_ANY>=} options the JSON options the entry is called with
 * @property {boolean=} visit whether the callbacks the entry makes are recorded too, as one more entry of one line
 */

/**
 * @typedef {object} ParseEntry
 * @property {(source: string, options: Record<string, EXPECTED_ANY>, log: string[] | undefined) => string[]} read what to snapshot, in order, writing each callback it makes to `log` where it is given one
 * @property {boolean=} records whether it takes callbacks `visit` records
 */

/**
 * An asynchronous printer a print set's `"print"` names: `processAsync` or the
 * language's minimizer, given the source as its one asset.
 * @typedef {(source: string, options: EXPECTED_ANY) => Promise<{ code: string, warnings?: unknown[], errors?: unknown[], extractedComments?: string[] }>} AsyncPrinter
 */

/**
 * @typedef {object} FixtureEntry
 * @property {string} name the fixture directory
 * @property {string} source its input
 * @property {PrintOptionSet[]} options the option sets it is printed under, minifying with the defaults first
 * @property {PrintOptionSet[]} behavior those of them whose print runs against the source and must do what it does
 * @property {ParseRun[]} parses the calls its `parse.json` asks for
 * @property {KnownDifference[]} expected what its `expected.json` lets it break
 */

/**
 * @param {string} file a JSON file
 * @returns {EXPECTED_ANY[]} its array, or none where the file is absent
 */
const readList = (file) =>
	fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];

/**
 * Every fixture of a language with what the runner asks of it. Its
 * `options.json` lists option sets to print it under as well; one marked
 * `"behavior": true` (marker left out of what the printer gets) also runs.
 * A print set names a renderer and a RegExp in JSON (see `printOptions`) and,
 * with `"print"`, an asynchronous printer (see `readPrint`); `parse.json`
 * lists `ParseRun`s, each read by `readRun`.
 * @param {FixtureLanguage} lang the language
 * @returns {FixtureEntry[]} one entry per fixture, by name
 */
const fixtures = (lang) => {
	/** @type {FixtureEntry[]} */
	const entries = [];
	const dir = path.join(FIXTURES, lang);
	// XML prints through the HTML printer, so its defaults name the dialect.
	/** @type {PrintOptionSet} */
	const first =
		lang === "xml" ? { xml: true, mode: "minify" } : { mode: "minify" };
	for (const name of fs.readdirSync(dir).sort()) {
		if (!fs.existsSync(path.join(dir, name, indexFile(lang)))) continue;
		/** @type {Map<string, PrintOptionSet>} */
		const options = new Map([[JSON.stringify(first), first]]);
		/** @type {Set<PrintOptionSet>} */
		const behavior = new Set();
		for (const { behavior: runs, ...one } of readList(
			path.join(dir, name, "options.json")
		)) {
			const key = JSON.stringify(one);
			if (!options.has(key)) options.set(key, one);
			if (runs === true) {
				behavior.add(/** @type {PrintOptionSet} */ (options.get(key)));
			}
		}
		entries.push({
			name,
			source: fixture(lang, name),
			options: [...options.values()],
			behavior: [...behavior],
			parses: readList(path.join(dir, name, "parse.json")),
			expected: readList(path.join(dir, name, "expected.json"))
		});
	}
	return entries;
};

/**
 * What a fixture's findings leave unexplained: each finding no entry names,
 * and each entry no finding needs any more, which has to go.
 * @param {{ preset: string, report: { relation: string, what: string, repro: string } }[]} findings what the relations reported
 * @param {KnownDifference[]} expected the fixture's known differences
 * @returns {string[]} one line per finding left over or entry gone stale
 */
const unexplained = (findings, expected) => {
	/** @type {Set<KnownDifference>} */
	const used = new Set();
	/** @type {string[]} */
	const left = [];
	for (const { preset, report } of findings) {
		const entry = expected.find(
			(one) =>
				one.relation === report.relation && report.repro.includes(one.contains)
		);
		if (entry === undefined) {
			left.push(
				`${report.relation} [${preset}] ${report.what}\n${report.repro}`
			);
		} else {
			used.add(entry);
		}
	}
	for (const entry of expected) {
		if (!used.has(entry)) {
			left.push(`stale: ${entry.relation} ${entry.contains}`);
		}
	}
	return left;
};

/**
 * A printed text as a snapshot holds it: raw where it reads as text, as a JSON
 * string where a control character would otherwise land in the snapshot file.
 * @param {string} text what was printed
 * @returns {string} the snapshot's value
 */
const snapshotText = (text) =>
	// eslint-disable-next-line no-control-regex
	/[\u0000-\u0008\u000B-\u001F\u007F]/.test(text) ? JSON.stringify(text) : text;

/**
 * @param {() => string} read what to run
 * @returns {string} its answer, or the error it throws
 */
const answerOf = (read) => {
	try {
		return read();
	} catch (err) {
		return `throws: ${/** @type {Error} */ (err).message}`;
	}
};

/** @type {Set<string>} */
const RUN_KEYS = new Set(["entry", "options", "visit"]);

/**
 * What one `parse.json` run snapshots: what its entry answers, then the
 * callbacks it made where `visit` asks. A name no entry has throws.
 * @param {Record<string, ParseEntry>} entries the language's entry points, its document parse first
 * @param {string} source the fixture's input
 * @param {ParseRun} run the run
 * @returns {string[]} the values to snapshot, in order
 */
const readRun = (entries, source, run) => {
	for (const key of Object.keys(run)) {
		if (!RUN_KEYS.has(key)) throw new Error(`unknown parse.json key "${key}"`);
	}
	const { entry = Object.keys(entries)[0], options = {}, visit = false } = run;
	if (!Object.prototype.hasOwnProperty.call(entries, entry)) {
		throw new Error(
			`unknown entry "${entry}", not one of ${Object.keys(entries).join(", ")}`
		);
	}
	const { read, records = false } = entries[entry];
	if (visit && !records) {
		throw new Error(`"${entry}" makes no callbacks to visit`);
	}
	/** @type {string[] | undefined} */
	const log = visit ? [] : undefined;
	const values = read(source, options, log);
	if (log !== undefined) values.push(log.join(" "));
	return values.map(snapshotText);
};

/**
 * Every visitor call a language's `SourceProcessor` makes, as one line: each
 * node entered as its type, name and range, and each one left as `/` its type.
 * @param {new () => { use: (visitors: EXPECTED_ANY) => { process: (source: string, options: EXPECTED_ANY) => unknown } }} Processor the language's `SourceProcessor`
 * @param {Record<string, number>} nodeTypes its `NodeType`
 * @param {string} source what to walk
 * @param {Record<string, EXPECTED_ANY>} options the process options, which print nothing
 * @returns {string} the visit line
 */
const walkLine = (Processor, nodeTypes, source, options) => {
	/** @type {string[]} */
	const out = [];
	/** @type {Record<number, { enter: (path: EXPECTED_ANY) => void, exit: (path: EXPECTED_ANY) => void }>} */
	const visitors = {};
	for (const [typeName, type] of Object.entries(nodeTypes)) {
		visitors[type] = {
			enter: (path) => {
				const name = path.name();
				out.push(
					`${typeName}${name ? `(${name})` : ""}[${path.start()},${path.end()}]`
				);
			},
			exit: () => {
				out.push(`/${typeName}`);
			}
		};
	}
	new Processor().use(visitors).process(source, options);
	return out.join(" ");
};

/**
 * A print set as the printer takes it: a `renderEmbeddedSource` name (or
 * `{ name, options }`) becomes that renderer of `embeddedRenderers.js`, and
 * `{ "regexp": source, "flags"?: flags }` anywhere becomes a RegExp.
 * @param {PrintOptionSet} given the set as its `options.json` holds it
 * @returns {{ options: PrintOptionSet, log: string[] | undefined }} the options, and what a recording renderer is offered, to snapshot after the print
 */
const printOptions = (given) => {
	/** @type {string[]} */
	const log = [];
	let records = false;
	/**
	 * @param {unknown} value a JSON value
	 * @returns {unknown} it with every RegExp and renderer in place
	 */
	const revive = (value) => {
		if (Array.isArray(value)) return value.map(revive);
		if (value === null || typeof value !== "object") return value;
		const object = /** @type {Record<string, EXPECTED_ANY>} */ (value);
		const keys = Object.keys(object);
		if (
			typeof object.regexp === "string" &&
			keys.every((key) => key === "regexp" || key === "flags")
		) {
			return new RegExp(object.regexp, object.flags);
		}
		/** @type {Record<string, unknown>} */
		const out = {};
		for (const key of keys) {
			if (key === "renderEmbeddedSource") {
				const renderer = namedRenderer(object[key], log);
				records = records || renderer.records;
				out[key] = renderer.render;
			} else {
				out[key] = revive(object[key]);
			}
		}
		return out;
	};
	const options = /** @type {PrintOptionSet} */ (revive(given));
	return { options, log: records ? log : undefined };
};

/** @type {["warnings", "errors", "extractedComments"]} */
const REPORTED = ["warnings", "errors", "extractedComments"];

/**
 * What a print set with `"print"` snapshots: the code the named printer
 * resolves to (or what it rejects with), then what it reported beside the
 * code where it reported anything, then a recording renderer's offers.
 * @param {Record<string, AsyncPrinter>} printers the language's asynchronous printers
 * @param {string} source the fixture's input
 * @param {PrintOptionSet & { print?: string }} set the print set, `print` included
 * @returns {Promise<string[]>} the values to snapshot, in order
 */
const readPrint = async (printers, source, set) => {
	const { print, ...rest } = set;
	if (
		print === undefined ||
		!Object.prototype.hasOwnProperty.call(printers, print)
	) {
		throw new Error(
			`unknown print "${print}", not one of ${Object.keys(printers).join(", ")}`
		);
	}
	const { options, log } = printOptions(rest);
	/** @type {string[]} */
	const values = [];
	try {
		const result = await printers[print](source, options);
		values.push(result.code);
		/** @type {string[]} */
		const reported = [];
		for (const key of REPORTED) {
			const list = result[key];
			if (list !== undefined && list.length > 0) {
				reported.push(`${key}: ${list.map(String).join(" | ")}`);
			}
		}
		if (reported.length > 0) values.push(reported.join("\n"));
	} catch (err) {
		values.push(`throws: ${/** @type {Error} */ (err).message}`);
	}
	if (log !== undefined) values.push(log.join(" "));
	return values.map(snapshotText);
};

module.exports = {
	answerOf,
	fixture,
	fixtures,
	printOptions,
	readPrint,
	readRun,
	snapshotText,
	unexplained,
	walkLine
};
