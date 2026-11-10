/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { parse: acornParse } = require("acorn");
const { parse: webpackParse } = require("../../../lib/javascript/syntax-parser");
const { wantedRespelling } = require("../../../tooling/compare-tools-harness");
const {
	cutsAt,
	hasher,
	oneLine,
	pathSpanWalk,
	shrink,
	signed,
	sliceRelation,
	spans,
	thrownText
} = require("./relations");

// Neither a child nor a range: `start` and `end` are the range itself, `range`
// and `loc` restate it, and `type` is a string.
const NOT_CHILD_KEYS = new Set(["type", "start", "end", "range", "loc"]);

/**
 * The nodes one ESTree node holds, in whatever order its keys are in.
 * @param {EXPECTED_ANY} node an ESTree node
 * @returns {EXPECTED_ANY[]} the nodes it holds
 */
const childNodesOf = (node) => {
	/** @type {EXPECTED_ANY[]} */
	const children = [];
	for (const key of Object.keys(node)) {
		if (NOT_CHILD_KEYS.has(key)) continue;
		const value = node[key];
		if (value === null || typeof value !== "object") continue;
		if (Array.isArray(value)) {
			for (const item of value) {
				if (item !== null && typeof item.type === "string") children.push(item);
			}
		} else if (typeof value.type === "string") {
			children.push(value);
		}
	}
	return children;
};

/**
 * Hold the parser's ranges to what they claim about the source they came from.
 *
 * `siblings` is off because ESTree says two siblings may share a range rather
 * than because webpack's parser drifts: a shorthand `{ a }` carries `key` and
 * `value` as separate nodes over the same bytes, and `{ a = 1 }` nests the
 * key's range inside the value's `AssignmentPattern`. Asking for it reports
 * 6136 of those over the fixtures and not one defect.
 * @param {string} source a script or a module
 * @param {EXPECTED_ANY} options what to parse it as
 * @returns {import("./relations").Report[]} what the ranges broke
 */
const jsSpans = (source, options) =>
	spans({
		length: source.length,
		contains: true,
		siblings: false,
		walk: pathSpanWalk({
			length: source.length,
			run: (enter, exit) => {
				const root = webpackParse(source, options);
				// WHY: an explicit stack, not recursion — the acorn corpus carries a
				// case nesting hundreds of arrays, which overflows a recursive walk
				// well before the parser that built it minds.
				/** @type {{ node: EXPECTED_ANY, children: EXPECTED_ANY[], index: number }[]} */
				const stack = [{ node: root, children: childNodesOf(root), index: 0 }];
				enter(root);
				while (stack.length > 0) {
					const top = stack[stack.length - 1];
					if (top.index === top.children.length) {
						exit(top.node);
						stack.pop();
						continue;
					}
					const child = top.children[top.index++];
					enter(child);
					stack.push({
						node: child,
						children: childNodesOf(child),
						index: 0
					});
				}
			},
			start: (node) => node.start,
			end: (node) => node.end,
			name: (node) => node.type,
			inner: () => undefined
		})
	});

/**
 * Parse one source the way a build would, as a module where that reads and as a
 * script otherwise.
 * @param {string} source a script or a module
 * @returns {import("./relations").Report[] | null} what its ranges broke, or null where the parser refused it
 */
const spansEitherGoal = (source) => {
	const options = goalFor(source);
	return options === null ? null : jsSpans(source, options);
};

// Both goals a build reads a file under, in the order it tries them.
const GOALS = /** @type {("module" | "script")[]} */ (["module", "script"]);

/**
 * The options one source parses under, as a build would read it: a module where
 * that works and a script otherwise.
 * @param {string} source a script or a module
 * @returns {EXPECTED_ANY} those options, or null where the parser refuses it either way
 */
const goalFor = (source) => {
	for (const sourceType of GOALS) {
		// The options a build parses with, so what is held is what ships:
		// `ranges` is on there, and a range is what this reads.
		/** @type {import("../../../lib/javascript/syntax-parser").ParserOptions} */
		const options = {
			sourceType,
			ecmaVersion: "latest",
			ranges: true,
			allowHashBang: true
		};
		try {
			webpackParse(source, options);
			return options;
		} catch (_error) {
			continue;
		}
	}
	return null;
};

/**
 * @typedef {{ what: string, start: number, end: number, size: number }} NodeRun
 */

/**
 * Every node in one source, in post-order with the size of its subtree — which
 * is what lets a subtree be read as a run rather than walked again.
 * @param {EXPECTED_ANY} root the tree
 * @returns {NodeRun[]} each node, children before parents
 */
const nodeRuns = (root) => {
	/** @type {NodeRun[]} */
	const runs = [];
	/** @type {{ node: EXPECTED_ANY, children: EXPECTED_ANY[], index: number, held: number }[]} */
	const stack = [
		{ node: root, children: sortedChildren(root), index: 0, held: 0 }
	];
	while (stack.length > 0) {
		const top = stack[stack.length - 1];
		if (top.index === top.children.length) {
			const size = top.held + 1;
			stack.pop();
			if (stack.length > 0) stack[stack.length - 1].held += size;
			runs.push({
				what: top.node.type,
				start: top.node.start,
				end: top.node.end,
				size
			});
			continue;
		}
		const child = top.children[top.index++];
		stack.push({
			node: child,
			children: sortedChildren(child),
			index: 0,
			held: 0
		});
	}
	return runs;
};

/**
 * @param {EXPECTED_ANY} node an ESTree node
 * @returns {EXPECTED_ANY[]} the nodes it holds, in source order
 */
const sortedChildren = (node) =>
	childNodesOf(node).sort((a, b) => a.start - b.start || a.end - b.end);

/**
 * What one node's subtree says: its shape and the offsets inside it, read
 * against the node's own start so the same construct digests the same wherever
 * it was found.
 * @param {readonly NodeRun[]} runs every node in post-order
 * @param {number} at which one to digest
 * @returns {string} its digest
 */
const runDigest = (runs, at) => {
	const node = runs[at];
	/** @type {string[]} */
	const out = [];
	for (let index = at - node.size + 1; index <= at; index++) {
		const one = runs[index];
		out.push(`${one.what}[${one.start - node.start},${one.end - node.start})`);
	}
	return out.join(" ");
};

/**
 * What a node's own source may have to be wrapped in to stand alone, widest
 * context last. Parentheses let an object literal, a function expression or a
 * class expression open a statement.
 *
 * WHY: the function and class contexts are this relation's normalization, not
 * a convenience. Out of context `yield x` and `await x` are not invalid, they
 * are an identifier and a call, and `super.x` and `return` are only syntax
 * inside a method and a function — so a slice read at the top level is
 * reported for meaning something else when only its extent is owed. Each is
 * tried under the source's own options, which is why the ladder runs from the
 * edition-neutral ones up: a case pinned to ES6 cannot parse `async function*`,
 * and its `yield` would read as an identifier if that were the only context
 * offering a generator.
 * @type {[string, string][]}
 */
const JS_SLICE_CONTEXTS = [
	["", ""],
	["(", ")"],
	// Named, because an anonymous function declaration cannot open a statement.
	["function f(){", "}"],
	["function* f(){", "}"],
	["async function f(){", "}"],
	["async function* f(){", "}"],
	["class X extends Y{ m(){", "} }"],
	["class X extends Y{ async *m(){", "} }"]
];

// Reparsing every node costs a parse of its own, so a source would cost its
// size times its depth. Each one is capped at this many times its own bytes,
// spent leaves first, which is where a range is most likely to be wrong.
const SLICE_BUDGET_FACTOR = 4;

/**
 * Hold each node's own source to the node it came from: the bytes between its
 * offsets, wrapped in the least context that lets them parse, give that node
 * back.
 * @param {string} source a script or a module
 * @param {EXPECTED_ANY} options what to parse it as
 * @returns {{ reports: import("./relations").Report[], read: number, skipped: number, capped: number, repeats: number } | null} what broke, how many answered and how many the budget cut, or null where the parser refuses the source
 */
const jsSlices = (source, options) => {
	/** @type {EXPECTED_ANY} */
	let root;
	try {
		root = webpackParse(source, options);
	} catch (_error) {
		// One of the corpus cases asserting the parser refuses it.
		return null;
	}
	const runs = nodeRuns(root);
	/** @type {import("./relations").SliceCandidate[]} */
	const candidates = [];
	let budget = source.length * SLICE_BUDGET_FACTOR;
	let capped = 0;
	let repeats = 0;
	// One shape is one question: a bundle carries the same `Identifier[0,3)`
	// hundreds of thousands of times, and reparsing each one asks nothing the
	// first did not. Spends the budget on the shapes a source actually holds.
	/** @type {Set<string>} */
	const seen = new Set();
	for (let at = 0; at < runs.length; at++) {
		const node = runs[at];
		const said = runDigest(runs, at);
		// Before the budget, not after: a shape already asked about must not spend
		// what is left, or a bundle's millionth identifier crowds out every
		// composite node in it.
		if (seen.has(said)) {
			repeats++;
			continue;
		}
		seen.add(said);
		const text = source.slice(node.start, node.end);
		if (text.length > budget) {
			capped++;
			continue;
		}
		budget -= text.length;
		candidates.push({
			what: node.what,
			said,
			reparse: () => {
				/** @type {string | null} */
				let disagreed = null;
				for (const [prefix, suffix] of JS_SLICE_CONTEXTS) {
					/** @type {NodeRun[]} */
					let again;
					try {
						again = nodeRuns(
							webpackParse(`${prefix}${text}${suffix}`, options)
						);
					} catch (_error) {
						continue;
					}
					// The node this slice is meant to be, where the wrapper put it.
					const want = again.findIndex(
						(one) =>
							one.what === node.what &&
							one.start === prefix.length &&
							one.end === prefix.length + text.length
					);
					if (want === -1) continue;
					const answer = runDigest(again, want);
					if (answer === said) return answer;
					if (disagreed === null) disagreed = answer;
				}
				// Nothing here stood these bytes alone, so what they lacked is a
				// context rather than a range: a labelled `break` needs its label.
				return disagreed;
			}
		});
	}
	return { ...sliceRelation(candidates), capped, repeats };
};

// What `catchStackOverflow` raises, whose position is where the stack ran out.
const STACK_REFUSAL = "Not enough stack space to parse input";

/**
 * What one parse of a source amounts to: every node's type and range and every
 * primitive a node carries, in walk order.
 *
 * WHY: the derived values are the point, not the offsets. A cached word, an
 * interned name or a reused column can hand back the last parse's answer with
 * every offset still right, so an identifier's `name`, a literal's `value` and
 * `raw`, an operator and a regexp's flags all go in. Read off the node's own
 * keys rather than a list of types, so a production added later is covered
 * without this being edited.
 * @param {string} source a script or a module
 * @param {EXPECTED_ANY} options what to parse it as
 * @param {(code: string) => string} print the printer, printing alone
 * @returns {string} the digest
 */
const jsPurityDigest = (source, options, print) => {
	const digest = hasher();
	/** @type {EXPECTED_ANY} */
	let root;
	try {
		root = webpackParse(source, options);
	} catch (error) {
		// A refusal is an answer too, and one that has to be the same answer: a
		// source rejected only after something else was read is state leaking.
		const message = /** @type {Error} */ (error).message;
		// Except this one. Running out of stack is a fact about the machine, and
		// the position it names is wherever the call depth around the parse
		// happened to run out, so only that it happened is owed.
		return message.startsWith(STACK_REFUSAL)
			? `refused: ${STACK_REFUSAL}`
			: `refused: ${message}`;
	}
	/** @type {EXPECTED_ANY[]} */
	const stack = [root];
	while (stack.length > 0) {
		const node = /** @type {EXPECTED_ANY} */ (stack.pop());
		digest.update(`${node.type}[${node.start},${node.end})`);
		/** @type {EXPECTED_ANY[]} */
		const children = [];
		for (const key of Object.keys(node)) {
			if (NOT_CHILD_KEYS.has(key)) continue;
			const value = node[key];
			if (value === null || typeof value !== "object") {
				digest.update(`|${key}=${String(value)}`);
				continue;
			}
			if (Array.isArray(value)) {
				for (const item of value) {
					if (item !== null && typeof item.type === "string") {
						children.push(item);
					}
				}
			} else if (typeof value.type === "string") {
				children.push(value);
			} else {
				// A regexp literal's `regex`, an import attribute's `with`: a plain
				// object the parser filled in rather than a node.
				for (const inner of Object.keys(value)) {
					digest.update(`|${key}.${inner}=${String(value[inner])}`);
				}
			}
		}
		digest.update("\n");
		for (let index = children.length - 1; index >= 0; index--) {
			stack.push(children[index]);
		}
	}
	try {
		digest.update(print(source));
	} catch (error) {
		digest.update(`print refused: ${/** @type {Error} */ (error).message}`);
	}
	return digest.hex();
};

// Where a cut lands, by the construct it interrupts: each pattern ends where the
// program is cut, just inside what the end of the input then has to close.
/** @type {[string, RegExp][]} */
const JS_CUTS = [
	["in a double-quoted string", /"[^"\\\n]/g],
	["in a single-quoted string", /'[^'\\\n]/g],
	["in a template", /`[^`$\\]/g],
	["in a template substitution", /\$\{/g],
	["in a block comment", /\/\*/g],
	["in a regular expression", /[=(,:]\s*\/(?![/*])/g],
	["in an argument list", /\w\(/g],
	["in a block", /\)\s*\{/g],
	["in an object literal", /[=(,:]\s*\{/g],
	["in an array literal", /[=(,:]\s*\[/g],
	["after an arrow", /[=]>/g],
	["in a class body", /\bclass\b[^{;]*\{/g],
	["in a member chain", /\w\./g]
];

// --- The printer's invariants -----------------------------------------------

// The option sets the printer is held over: what a production build minifies
// with, the printer alone, and the printer laying out.
/** @type {[string, EXPECTED_ANY][]} */
const PRESETS = [
	["default", {}],
	["format", { compress: false, mangle: false }],
	["beautify", { compress: false, mangle: false, format: { beautify: true } }]
];

/**
 * webpack's one-pass minify: one JavaScript `SourceProcessor` run, given its
 * options as `jsMinify` gives them, `compress` and `mangle` on where unnamed.
 * @param {string} code the source
 * @param {EXPECTED_ANY} options the minify options
 * @returns {{ code: string }} the output
 */
const minifyOnePass = (code, options) => {
	const { SourceProcessor } = require("../../../lib/javascript/syntax");

	return new SourceProcessor().process(code, {
		compress: {},
		mangle: true,
		...options,
		sourceType: options.module ? "module" : "script",
		mode: options.format && options.format.beautify ? "beautify" : "minify"
	});
};

/**
 * The printer under one preset, and the same printer reading its output back:
 * minified twice, an output shrinks again, which is the compressor's business
 * rather than a printer moving, so the second pass prints and nothing else.
 * @param {EXPECTED_ANY} minifySync the printer's synchronous minify
 * @param {EXPECTED_ANY} options one preset's options
 * @param {boolean} module whether the source is a module
 * @returns {{ minify: (code: string) => string, reprint: (code: string) => string }} the two passes
 */
const printerFor = (minifySync, options, module) => {
	// Fresh options each call: the minifier writes its defaults into them.
	/**
	 * @param {EXPECTED_ANY} given options
	 * @returns {(code: string) => string} a pass under them
	 */
	const pass = (given) => (code) =>
		minifySync(code, { ...JSON.parse(JSON.stringify(given)), module }).code;
	return {
		minify: pass(options),
		reprint: pass({ compress: false, mangle: false, format: options.format })
	};
};

/**
 * @param {string} code a program
 * @param {boolean} module whether it is a module
 * @returns {{ label: string, value: string, start: number, end: number }[] | null} its tokens, or null where acorn refuses it
 */
const tokensOf = (code, module) => {
	/** @type {import("acorn").Token[]} */
	const tokens = [];
	try {
		// Read off a parse: the tokenizer alone takes a regexp after `yield`
		// or a class for a division.
		acornParse(code, {
			ecmaVersion: "latest",
			sourceType: module ? "module" : "script",
			allowHashBang: true,
			onToken: tokens
		});
		return tokens.map((token) => ({
			label: token.type.label,
			// acorn's types leave out the `value` every token carries.
			value: String(
				/** @type {import("acorn").Token & { value: unknown }} */ (token).value
			),
			start: token.start,
			end: token.end
		}));
	} catch (_error) {
		return null;
	}
};

/**
 * What a program says, token by token, its spelling set aside: what an
 * idempotence finding is told apart by, and what a respelling must keep.
 * @param {string} code a program
 * @param {boolean} module whether it is a module
 * @returns {string} its tokens' kinds and values
 */
const tokenMeaning = (code, module) => {
	const tokens = tokensOf(code, module);
	return tokens === null
		? code
		: tokens.map((token) => `${token.label}:${token.value}`).join("\n");
};

/**
 * @typedef {{ label: string, text: string, start: number, end: number }} Site
 */

/**
 * @typedef {{ name: string, write: (site: Site) => string | null }} Respelling
 */

// Words a context reads as syntax when spelled plainly, which an escape would
// make an error or another construct; every other name escapes freely.
const CONTEXTUAL_NAMES = new Set([
	"accessor",
	"as",
	"assert",
	"async",
	"await",
	"defer",
	"from",
	"get",
	"let",
	"meta",
	"of",
	"set",
	"source",
	"static",
	"target",
	"using",
	"yield"
]);

// Spellings the language reads alike: the printer owes them one output.
/** @type {Respelling[]} */
const JS_RESPELLINGS = [
	{
		name: "quote-double",
		write: ({ label, text }) =>
			label === "string" && text[0] === "'" && !/["\\]/.test(text)
				? `"${text.slice(1, -1)}"`
				: null
	},
	{
		name: "quote-single",
		write: ({ label, text }) =>
			label === "string" && text[0] === '"' && !/['\\]/.test(text)
				? `'${text.slice(1, -1)}'`
				: null
	},
	{
		name: "hex",
		write: ({ label, text }) =>
			label === "num" &&
			/^(?:0|[1-9]\d{0,14})$/.test(text) &&
			Number(text) <= Number.MAX_SAFE_INTEGER
				? `0x${Number(text).toString(16)}`
				: null
	},
	{
		name: "name-escape",
		write: ({ label, text }) =>
			label === "name" &&
			/^[A-Za-z_$]/.test(text) &&
			!CONTEXTUAL_NAMES.has(text)
				? `\\u${text.charCodeAt(0).toString(16).padStart(4, "0")}${text.slice(
						1
					)}`
				: null
	}
];

/**
 * @param {string} code a program
 * @param {Site[]} sites where it is respelled
 * @param {Respelling} respelling how
 * @returns {string} the program respelled there
 */
const respell = (code, sites, respelling) => {
	let out = "";
	let read = 0;
	for (const site of sites) {
		const written = respelling.write(site);
		if (written === null) continue;
		out += code.slice(read, site.start) + written;
		read = site.end;
	}
	return out + code.slice(read);
};

/**
 * @typedef {{ kind: string, delta: number, note: string }} Finding
 */

/**
 * What respelling some sites does to the output: nothing is owed, so any change
 * is a finding, read by whether what the output says moved too.
 * @param {(code: string) => string} minify the printer under one preset
 * @param {string} code a program
 * @param {boolean} module whether it is a module
 * @param {string} minified what the printer made of it
 * @param {Site[]} sites where it is respelled
 * @param {Respelling} respelling how
 * @returns {Finding | null} what moved
 */
const spellingFinding = (minify, code, module, minified, sites, respelling) => {
	const mutated = respell(code, sites, respelling);
	if (mutated === code) return null;
	// Checked against the tokenizer rather than argued for: a respelling that
	// moved what the program says is dropped rather than reported.
	if (tokenMeaning(mutated, module) !== tokenMeaning(code, module)) return null;
	/** @type {string} */
	let answer;
	try {
		answer = minify(mutated);
	} catch (error) {
		return { kind: "throws", delta: 0, note: thrownText(error) };
	}
	if (answer === minified) return null;
	return {
		kind:
			tokenMeaning(answer, module) === tokenMeaning(minified, module)
				? "bytes"
				: "differs",
		delta: answer.length - minified.length,
		note: ""
	};
};

/**
 * @param {Site[]} sites the sites a finding was narrowed to
 * @param {Respelling} respelling how they were respelled
 * @returns {string} the report's repro
 */
const reproOf = (sites, respelling) => {
	const from = sites.map((site) => site.text).join(" ");
	const to = sites.map((site) => respelling.write(site) || site.text).join(" ");
	return `    ${oneLine(from, 76)}\n      -> ${oneLine(to, 76)}`;
};

/**
 * Every respelling over one program: each that moves the output is bisected
 * down to the sites carrying it.
 * @param {(code: string) => string} minify the printer under one preset
 * @param {string} code a program
 * @param {boolean} module whether it is a module
 * @param {string} minified what the printer made of it
 * @returns {import("./relations").Report[]} what moved
 */
const sweepRespellings = (minify, code, module, minified) => {
	/** @type {import("./relations").Report[]} */
	const reports = [];
	const tokens = tokensOf(code, module);
	if (tokens === null) return reports;
	/** @type {Site[]} */
	const sites = tokens.map((token) => ({
		label: token.label,
		text: code.slice(token.start, token.end),
		start: token.start,
		end: token.end
	}));
	const respellings = JS_RESPELLINGS.filter((one) =>
		wantedRespelling(one.name)
	);
	// No site is one two respellings write, so all of them at once cost one
	// minify, and only a program that moves pays one per respelling.
	/** @type {Respelling} */
	const every = {
		name: "every",
		write: (site) => {
			for (const respelling of respellings) {
				const written = respelling.write(site);
				if (written !== null) return written;
			}
			return null;
		}
	};
	if (spellingFinding(minify, code, module, minified, sites, every) === null) {
		return reports;
	}
	for (const respelling of respellings) {
		const touched = sites.filter((site) => respelling.write(site) !== null);
		if (touched.length === 0) continue;
		/**
		 * @param {Site[]} subset the sites to respell
		 * @returns {Finding | null} what moved
		 */
		const holds = (subset) =>
			spellingFinding(minify, code, module, minified, subset, respelling);
		const found = holds(touched);
		if (found === null) continue;
		const carried = shrink(holds, touched, found.kind);
		const blamed = (carried === touched ? found : holds(carried)) || found;
		reports.push({
			relation: `respelling ${respelling.name}`,
			what:
				blamed.kind === "throws"
					? `threw: ${blamed.note}`
					: `${blamed.kind}, ${signed(blamed.delta)}`,
			repro: reproOf(carried, respelling)
		});
	}
	return reports;
};

/**
 * @param {string} source a program
 * @param {boolean} module whether it is a module
 * @returns {boolean} whether the parser reads it at the latest edition
 */
const parsesAsLatest = (source, module) => {
	try {
		webpackParse(source, {
			sourceType: module ? "module" : "script",
			ecmaVersion: "latest",
			allowHashBang: true
		});
		return true;
	} catch (_error) {
		return false;
	}
};

/**
 * Whether a source is a module, as a build reads it.
 * @param {string} source a script or a module
 * @returns {boolean | null} true for a module, null where neither goal parses
 */
const isModule = (source) => {
	const goal = goalFor(source);
	return goal === null ? null : goal.sourceType === "module";
};

/** @type {import("./index").SyntaxInvariants} */
const invariants = {
	printers: (source) => {
		const module = isModule(source);
		// Read as a build reads it, at the latest edition.
		if (module === null || !parsesAsLatest(source, module)) return [];
		return PRESETS.map(([name, options]) => {
			const { minify, reprint } = printerFor(minifyOnePass, options, module);
			return {
				name,
				minify,
				reprint,
				says: (text) => tokenMeaning(text, module)
			};
		});
	},
	spans: spansEitherGoal,
	slices: (source) => {
		const goal = goalFor(source);
		const answered = goal === null ? null : jsSlices(source, goal);
		return answered === null ? null : answered.reports;
	},
	digest: (source) => {
		const goal = goalFor(source);
		if (goal === null) return "";
		const format = /** @type {[string, EXPECTED_ANY]} */ (
			PRESETS.find(([name]) => name === "format")
		);
		const { minify } = printerFor(
			minifyOnePass,
			format[1],
			goal.sourceType === "module"
		);
		return jsPurityDigest(source, goal, minify);
	},
	respellings: (printer, source, printed) =>
		sweepRespellings(printer.minify, source, Boolean(isModule(source)), printed),
	cuts: (source) => cutsAt(source, JS_CUTS)
};

module.exports = {
	...invariants,
	JS_CUTS,
	JS_RESPELLINGS,
	PRESETS,
	goalFor,
	jsPurityDigest,
	jsSlices,
	jsSpans,
	minifyOnePass,
	parsesAsLatest,
	printerFor,
	spansEitherGoal,
	sweepRespellings,
	tokenMeaning
};
