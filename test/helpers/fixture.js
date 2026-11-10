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
 * @property {(boolean | VisitSpec)=} visit `true`: the callbacks the entry makes are logged as one more entry of one line; on `SourceProcessor`, what its walk visits, logs and does
 * @property {number=} pos the offset the entry starts reading at, where it takes one
 * @property {string[]=} fields reads (see `fieldRead`) made through `A` on every node the entry returns, logged as one more entry
 */

/**
 * What a walk visits, logs and does, for a `SourceProcessor` run's or a print
 * set's `visit`.
 * @typedef {object} VisitSpec
 * @property {string[]=} types the `NodeType` names visited, every one where absent
 * @property {string[]=} fields the reads (see `fieldRead`) each enter logs
 * @property {boolean=} exit whether exits are logged too, as they are by default
 * @property {VisitAction[]=} at what a visitor does at a node
 */

/**
 * @typedef {object} VisitAction
 * @property {string} type the `NodeType` name it acts at
 * @property {("enter" | "exit")=} on the call it acts in, enter where absent
 * @property {string=} name only at a node of this name
 * @property {string=} source only at a node whose source starts with this
 * @property {number=} index only at a node at this index among its siblings
 * @property {"skipChildren" | "stop" | "remove" | "replace"} do the path method it calls
 * @property {string=} with the text `replace` writes in the node's place
 */

/**
 * @typedef {object} ParseContext
 * @property {number} pos the run's `pos`
 * @property {string[] | undefined} fields the run's `fields`
 * @property {VisitSpec | undefined} visit the run's `visit`, where it is an object
 */

/**
 * @typedef {object} ParseEntry
 * @property {(source: string, options: Record<string, EXPECTED_ANY>, log: string[] | undefined, context: ParseContext) => string[]} read what to snapshot, in order, writing each callback it makes to `log` where it is given one
 * @property {boolean=} records whether it takes callbacks `visit: true` records
 * @property {boolean=} walks whether it fires the visitors a `visit` object asks for
 * @property {boolean=} positions whether it takes `pos`
 * @property {boolean=} trees whether it returns nodes `fields` reads
 */

/**
 * The enums and accessors a language's parser exports, which `visit` and
 * `fields` name members of.
 * @typedef {object} SyntaxEnums
 * @property {Record<string, number>} NodeType node types
 * @property {Record<string, number>} Flag node flags
 * @property {Record<string, number>} Field node fields
 * @property {Record<string, number>} Part node parts
 * @property {EXPECTED_ANY} A the accessors, each taking the node last
 */

/**
 * What a print set's `minimizer` hands the minimizer beside the source.
 * @typedef {object} MinimizerCall
 * @property {EXPECTED_ANY=} extractComments its `extractComments` argument, a RegExp written as `{ "regexp" }`
 * @property {string=} sourceMap a file in the fixture's directory holding the input source map
 * @property {boolean=} buffer whether the asset is a Buffer rather than a string
 * @property {string=} asset the asset's name, `index.<ext>` where absent
 */

/**
 * The printers a print set's `print` names: `process` (the default),
 * `processAsync` and the language's minimizer.
 * @typedef {object} Printers
 * @property {new () => EXPECTED_ANY} Processor the language's `SourceProcessor`
 * @property {SyntaxEnums} enums its parser's enums
 * @property {string} minimizer the minimizer's name
 * @property {() => (...args: EXPECTED_ANY[]) => Promise<EXPECTED_ANY>} load loads the minimizer, whose arguments and result differ by language
 * @property {string} asset the asset name it is given the source under
 */

/**
 * @typedef {object} FixtureEntry
 * @property {string} name the fixture directory
 * @property {string} dir its path
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
 * A print set names a renderer and a RegExp in JSON (see `printOptions`), and
 * `print`, `visit` and `minimizer` in one are read by `readPrint`;
 * `parse.json` lists `ParseRun`s, each read by `readRun`.
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
			dir: path.join(dir, name),
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

/**
 * @param {Record<string, unknown>} object a JSON object a fixture wrote
 * @param {Set<string>} keys the keys it may hold
 * @param {string} what what it is, for the error
 * @returns {void}
 */
const checkKeys = (object, keys, what) => {
	for (const key of Object.keys(object)) {
		if (!keys.has(key)) throw new Error(`unknown ${what} key "${key}"`);
	}
};

/**
 * @param {Record<string, number>} table a language's `NodeType`, `Flag`, `Field` or `Part`
 * @param {string} name a member's name
 * @param {string} what the table's name, for the error
 * @returns {number} the member
 */
const enumValue = (table, name, what) => {
	if (!Object.prototype.hasOwnProperty.call(table, name)) {
		throw new Error(`unknown ${what} "${name}"`);
	}
	return table[name];
};

/**
 * @param {SyntaxEnums} enums the language's enums
 * @param {number} type a node type
 * @returns {string} its `NodeType` name
 */
const typeName = (enums, type) =>
	/** @type {string} */ (
		Object.keys(enums.NodeType).find((name) => enums.NodeType[name] === type)
	);

/**
 * @param {unknown} value a read off a node
 * @returns {string} it as a log line holds it
 */
const valueText = (value) => {
	if (typeof value === "bigint") return `${value}n`;
	if (value === undefined) return "undefined";
	return JSON.stringify(value);
};

/** @type {Set<string>} */
const PLAIN_FIELDS = new Set([
	"name",
	"value",
	"source",
	"range",
	"loc",
	"childCount"
]);

/** @type {Set<string>} */
const PART_FIELDS = new Set([
	"rangeOf",
	"startOf",
	"endOf",
	"textOf",
	"sourceOf"
]);

/**
 * One read a `fields` list names, made on a path (the node left out) or on
 * `A` with the node: `name`, `value`, `source`, `range`, `loc`, `childCount`,
 * on a path `index` and `parent`, and `flag:`, `fieldCount:` or a part read
 * (`rangeOf:`, `startOf:`, `endOf:`, `textOf:`, `sourceOf:`) with its member.
 * @param {string} field the read's name
 * @param {SyntaxEnums} enums the language's enums
 * @param {boolean} onPath whether it reads a visitor's path rather than `A`
 * @returns {(reader: EXPECTED_ANY, node: unknown) => unknown} the read
 */
const fieldRead = (field, enums, onPath) => {
	const colon = field.indexOf(":");
	if (colon === -1) {
		if (PLAIN_FIELDS.has(field)) return (reader, node) => reader[field](node);
		if (onPath && field === "index") return (reader) => reader.index;
		if (onPath && field === "parent") {
			return (reader) =>
				reader.parent === null
					? null
					: typeName(enums, reader.type(reader.parent));
		}
		throw new Error(`unknown field "${field}"`);
	}
	const method = field.slice(0, colon);
	const member = field.slice(colon + 1);
	if (method === "flag") {
		const flag = enumValue(enums.Flag, member, "Flag");
		return (reader, node) => reader.flag(flag, node);
	}
	if (method === "fieldCount") {
		const id = enumValue(enums.Field, member, "Field");
		return (reader, node) => reader.fieldCount(id, node);
	}
	if (!PART_FIELDS.has(method)) throw new Error(`unknown field "${field}"`);
	const part = enumValue(enums.Part, member, "Part");
	if (method !== "sourceOf") {
		return (reader, node) => reader[method](part, node);
	}
	return (reader, node) => {
		const range = reader.rangeOf(part, node);
		return range === null ? null : reader.source(range[0], range[1]);
	};
};

/**
 * @param {EXPECTED_ANY} reader a path, or `A`
 * @param {unknown} node the node `A` reads, undefined on a path
 * @param {string} name the node's type name
 * @param {[string, (reader: EXPECTED_ANY, node: unknown) => unknown][]} reads the `fields` reads
 * @returns {string} the node as a log line holds it
 */
const nodeLine = (reader, node, name, reads) => {
	let line = `${name}[${reader.start(node)},${reader.end(node)}]`;
	for (const [field, read] of reads) {
		line += ` ${field}=${valueText(read(reader, node))}`;
	}
	return line;
};

/** @type {Set<string>} */
const VISIT_KEYS = new Set(["types", "fields", "exit", "at"]);
/** @type {Set<string>} */
const ACTION_KEYS = new Set([
	"type",
	"on",
	"name",
	"source",
	"index",
	"do",
	"with"
]);
/** @type {Set<string>} */
const ACTIONS = new Set(["skipChildren", "stop", "remove", "replace"]);

/**
 * Visitors that log each call `spec` asks for into `log`, one line each:
 * `Type[start,end]` and its `fields` on enter, `/Type` on exit, then `!` and
 * each action of `at` the call took.
 * @param {VisitSpec} spec what to visit, log and do
 * @param {SyntaxEnums} enums the language's enums
 * @param {string[]} log where each call is written
 * @returns {Record<number, { enter: (path: EXPECTED_ANY) => void, exit?: (path: EXPECTED_ANY) => void }>} the visitor map
 */
const visitorsOf = (spec, enums, log) => {
	checkKeys(spec, VISIT_KEYS, "visit");
	const {
		types = Object.keys(enums.NodeType),
		fields = [],
		exit = true,
		at = []
	} = spec;
	/** @type {[string, (reader: EXPECTED_ANY, node: unknown) => unknown][]} */
	const reads = fields.map((field) => [field, fieldRead(field, enums, true)]);
	for (const action of at) {
		checkKeys(action, ACTION_KEYS, "visit action");
		enumValue(enums.NodeType, action.type, "NodeType");
		if (!ACTIONS.has(action.do) || typeof enums.A[action.do] !== "function") {
			throw new Error(`a path here cannot "${action.do}"`);
		}
		const on = action.on || "enter";
		if (on !== "enter" && on !== "exit") throw new Error(`unknown on "${on}"`);
		if ((action.do === "replace") !== (typeof action.with === "string")) {
			throw new Error('"with" is the text "replace" writes, and only that');
		}
	}
	/**
	 * @param {VisitAction} action an action of `at`
	 * @param {EXPECTED_ANY} path the path it is offered
	 * @returns {boolean} whether the node is the one it names
	 */
	const matches = (action, path) =>
		(action.name === undefined || path.name() === action.name) &&
		(action.source === undefined || path.source().startsWith(action.source)) &&
		(action.index === undefined || path.index === action.index);
	/** @type {Record<number, { enter: (path: EXPECTED_ANY) => void, exit?: (path: EXPECTED_ANY) => void }>} */
	const visitors = {};
	for (const name of types) {
		const mine = at.filter((action) => action.type === name);
		/**
		 * @param {"enter" | "exit"} on which call this is
		 * @param {EXPECTED_ANY} path its path
		 * @param {string} line what it logs before its actions
		 * @param {boolean} logs whether it logs at all
		 * @returns {void}
		 */
		const call = (on, path, line, logs) => {
			/** @type {string[]} */
			const done = [];
			for (const action of mine) {
				if ((action.on || "enter") !== on || !matches(action, path)) continue;
				if (action.do === "replace") path.replace(action.with);
				else path[action.do]();
				done.push(`!${action.do}`);
			}
			if (logs) log.push([line, ...done].join(" "));
		};
		const type = enumValue(enums.NodeType, name, "NodeType");
		visitors[type] = {
			enter: (path) =>
				call("enter", path, nodeLine(path, undefined, name, reads), true)
		};
		if (exit || mine.some((action) => action.on === "exit")) {
			visitors[type].exit = (path) => call("exit", path, `/${name}`, exit);
		}
	}
	return visitors;
};

/**
 * The nodes a parse returned and every one under them, each as `nodeLine`
 * writes it with the `fields` reads made through `A`, indented by depth.
 * @param {SyntaxEnums} enums the language's enums, `A` among them
 * @param {number[]} roots what the entry point returned
 * @param {string[]} fields the reads to log
 * @returns {string} one line per node
 */
const treeLines = (enums, roots, fields) => {
	const { A } = enums;
	/** @type {[string, (reader: EXPECTED_ANY, node: unknown) => unknown][]} */
	const reads = fields.map((field) => [field, fieldRead(field, enums, false)]);
	const fieldIds = Object.values(enums.Field);
	/** @type {Set<number>} */
	const seen = new Set();
	/** @type {string[]} */
	const out = [];
	/**
	 * @param {number} node a node
	 * @param {number} depth how far under a root it is
	 * @returns {void}
	 */
	const visit = (node, depth) => {
		if (seen.has(node)) return;
		seen.add(node);
		out.push(
			"  ".repeat(depth) +
				nodeLine(A, node, typeName(enums, A.type(node)), reads)
		);
		for (const child of A.children(node)) visit(child, depth + 1);
		for (const id of fieldIds) {
			for (let i = 0, count = A.fieldCount(id, node); i < count; i++) {
				visit(A.field(i, id, node), depth + 1);
			}
		}
	};
	for (const root of roots) visit(root, 0);
	return out.join("\n");
};

/** @type {Set<string>} */
const RUN_KEYS = new Set(["entry", "options", "visit", "pos", "fields"]);

/**
 * What one `parse.json` run snapshots: what its entry answers, then the
 * callbacks it made where `visit` is `true`. A name or key the entry does not
 * take throws.
 * @param {Record<string, ParseEntry>} entries the language's entry points, its document parse first
 * @param {string} source the fixture's input
 * @param {ParseRun} run the run
 * @returns {string[]} the values to snapshot, in order
 */
const readRun = (entries, source, run) => {
	checkKeys(run, RUN_KEYS, "parse.json");
	const {
		entry = Object.keys(entries)[0],
		options = {},
		visit = false,
		pos = 0,
		fields
	} = run;
	if (!Object.prototype.hasOwnProperty.call(entries, entry)) {
		throw new Error(
			`unknown entry "${entry}", not one of ${Object.keys(entries).join(", ")}`
		);
	}
	const {
		read,
		records = false,
		walks = false,
		positions = false,
		trees = false
	} = entries[entry];
	if (visit === true && !records) {
		throw new Error(`"${entry}" makes no callbacks to visit`);
	}
	if (typeof visit === "object" && !walks) {
		throw new Error(`"${entry}" fires no visitors`);
	}
	if (pos !== 0 && !positions) throw new Error(`"${entry}" takes no pos`);
	if (fields !== undefined && !trees) {
		throw new Error(`"${entry}" returns no tree to read fields of`);
	}
	/** @type {string[] | undefined} */
	const log = visit === true ? [] : undefined;
	const values = read(source, options, log, {
		pos,
		fields,
		visit: typeof visit === "object" ? visit : undefined
	});
	if (log !== undefined) values.push(log.join(" "));
	return values.map(snapshotText);
};

/**
 * Every visitor call a language's `SourceProcessor` makes. Without `spec`, one
 * line: each node entered as its type, name and range, and each one left as
 * `/` its type; with it, what `visitorsOf` logs, a line per call.
 * @param {new () => { use: (visitors: EXPECTED_ANY) => { process: (source: string, options: EXPECTED_ANY) => unknown } }} Processor the language's `SourceProcessor`
 * @param {SyntaxEnums} enums its enums
 * @param {string} source what to walk
 * @param {Record<string, EXPECTED_ANY>} options the process options, which print nothing
 * @param {VisitSpec=} spec what to visit, log and do
 * @returns {string} the visit log
 */
const walkLine = (Processor, enums, source, options, spec) => {
	/** @type {string[]} */
	const out = [];
	if (spec !== undefined) {
		new Processor().use(visitorsOf(spec, enums, out)).process(source, options);
		return out.join("\n");
	}
	/** @type {Record<number, { enter: (path: EXPECTED_ANY) => void, exit: (path: EXPECTED_ANY) => void }>} */
	const visitors = {};
	for (const [name, type] of Object.entries(enums.NodeType)) {
		visitors[type] = {
			enter: (path) => {
				const nodeName = path.name();
				out.push(
					`${name}${nodeName ? `(${nodeName})` : ""}[${path.start()},${path.end()}]`
				);
			},
			exit: () => {
				out.push(`/${name}`);
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

/** @type {Set<string>} */
const MINIMIZER_KEYS = new Set([
	"extractComments",
	"sourceMap",
	"buffer",
	"asset"
]);

/**
 * @param {PrintOptionSet} set a print set
 * @returns {boolean} whether `readPrint` prints it, as `print`, `visit` or `minimizer` asks
 */
const declaresPrint = (set) =>
	"print" in set || "visit" in set || "minimizer" in set;

/**
 * A reported error as its text, or only its name where the engine throws it,
 * as V8 and JavaScriptCore word those messages differently.
 * @param {unknown} value what a minimizer reported
 * @returns {string} its text
 */
const reportText = (value) =>
	value instanceof TypeError ||
	value instanceof RangeError ||
	value instanceof ReferenceError
		? value.name
		: String(value);

/**
 * @param {string} key a key
 * @param {unknown} value its value
 * @returns {unknown} an Error as its text, everything else as it is
 */
const errorText = (key, value) =>
	value instanceof Error ? reportText(value) : value;

/**
 * What a print set with `print`, `visit` or `minimizer` snapshots: the code,
 * or what the print throws, then what the minimizer returned beside it (all of
 * it under `minimizer`, else only non-empty reports), then the `visit` log,
 * then a recording renderer's offers.
 * @param {Printers} printers the language's printers
 * @param {string} dir the fixture's directory, which `minimizer.sourceMap` is read from
 * @param {string} source the fixture's input
 * @param {PrintOptionSet & { print?: string, visit?: VisitSpec, minimizer?: MinimizerCall }} set the print set
 * @returns {Promise<string[]>} the values to snapshot, in order
 */
const readPrint = async (printers, dir, source, set) => {
	const { print = "process", visit, minimizer, ...rest } = set;
	const names = ["process", "processAsync", printers.minimizer];
	if (!names.includes(print)) {
		throw new Error(`unknown print "${print}", not one of ${names.join(", ")}`);
	}
	const minimizes = print === printers.minimizer;
	if (visit !== undefined && minimizes) {
		throw new Error(`"${print}" takes no visitors`);
	}
	if (minimizer !== undefined && !minimizes) {
		throw new Error(`"minimizer" needs print "${printers.minimizer}"`);
	}
	const { options, log } = printOptions(rest);
	/** @type {string[]} */
	const visits = [];
	const visitors =
		visit === undefined ? undefined : visitorsOf(visit, printers.enums, visits);
	const call = minimizer || {};
	checkKeys(call, MINIMIZER_KEYS, "minimizer");
	const map =
		call.sourceMap === undefined
			? undefined
			: JSON.parse(fs.readFileSync(path.join(dir, call.sourceMap), "utf8"));
	const extractComments =
		call.extractComments === undefined
			? undefined
			: /** @type {{ extractComments: unknown }} */ (
					/** @type {unknown} */ (
						printOptions(
							/** @type {PrintOptionSet} */ (
								/** @type {unknown} */ ({
									extractComments: call.extractComments
								})
							)
						).options
					)
				).extractComments;
	/** @type {string[]} */
	const values = [];
	try {
		/** @type {{ code: string, [key: string]: EXPECTED_ANY }} */
		let result;
		if (minimizes) {
			const asset = call.asset || printers.asset;
			result = await printers.load()(
				{ [asset]: call.buffer ? Buffer.from(source, "utf8") : source },
				map,
				options,
				extractComments
			);
		} else {
			const processor = new printers.Processor();
			if (visitors !== undefined) processor.use(visitors);
			result =
				print === "process"
					? processor.process(source, options)
					: await processor.processAsync(source, options);
		}
		values.push(result.code);
		if (minimizer !== undefined) {
			const { code, ...returned } = result;
			values.push(JSON.stringify(returned, errorText));
		} else {
			/** @type {string[]} */
			const reported = [];
			for (const key of REPORTED) {
				const list = result[key];
				if (list !== undefined && list.length > 0) {
					reported.push(`${key}: ${list.map(reportText).join(" | ")}`);
				}
			}
			if (reported.length > 0) values.push(reported.join("\n"));
		}
	} catch (err) {
		values.push(`throws: ${/** @type {Error} */ (err).message}`);
	}
	if (visitors !== undefined) values.push(visits.join("\n"));
	if (log !== undefined) values.push(log.join(" "));
	return values.map(snapshotText);
};

module.exports = {
	answerOf,
	declaresPrint,
	enumValue,
	fixture,
	fixtures,
	printOptions,
	readPrint,
	readRun,
	snapshotText,
	treeLines,
	unexplained,
	walkLine
};
