/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const vm = require("vm");
const { parse: acornParse } = require("acorn");
const { isStackOverflow } = require("../fixture");
const { parse: webpackParse } = require("../../../lib/javascript/syntax-parser");
const { wantedRespelling } = require("../../../tooling/compare-tools-harness");
const {
	cutsAt,
	hasher,
	meaningRelation,
	noticeRelation,
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
		// Where the stack runs out is the machine's, not the printer's answer.
		if (isStackOverflow(error)) throw error;
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
 * @typedef {{ label: string, text: string, start: number, end: number, directive: boolean }} Site
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
	},
	{
		name: "string-escape",
		// A directive reads its spelling: `'use\x20strict'` is not `use strict`.
		write: ({ label, text, directive }) =>
			label === "string" && !directive ? asEscaped(text) : null
	},
	{
		name: "exponent",
		write: ({ label, text }) => {
			const match = /^(\d+)\.(\d+)$/.exec(text);
			if (label !== "num" || match === null) return null;
			const digits = `${match[1]}${match[2]}`.replace(/^0+(?=\d)/, "");
			return `${digits}e-${match[2].length}`;
		}
	}
];

/**
 * A string with its first ASCII letter outside an escape written as `\xHH`,
 * which reads as the same character.
 * @param {string} text a string literal, delimiters included
 * @returns {string | null} it respelled, or null where it holds no such letter
 */
const asEscaped = (text) => {
	for (let at = 1; at < text.length - 1; at++) {
		const character = text[at];
		if (character === "\\") {
			const next = text[at + 1];
			if (next === "x") at += 3;
			else if (next === "u") {
				at = text[at + 2] === "{" ? text.indexOf("}", at) : at + 5;
			} else at++;
			continue;
		}
		if (/[A-Za-z]/.test(character)) {
			const code = character.charCodeAt(0).toString(16);
			return `${text.slice(0, at)}\\x${code}${text.slice(at + 1)}`;
		}
	}
	return null;
};

/**
 * Where each directive of a program starts, read off acorn's tree.
 * @param {string} code a program
 * @param {boolean} module whether it is a module
 * @returns {Set<number>} the start of each directive's string
 */
const directiveStarts = (code, module) => {
	/** @type {Set<number>} */
	const starts = new Set();
	if (!/["']/.test(code)) return starts;
	/** @type {EXPECTED_ANY[]} */
	const stack = [
		acornParse(code, {
			ecmaVersion: "latest",
			sourceType: module ? "module" : "script",
			allowHashBang: true
		})
	];
	while (stack.length > 0) {
		const node = stack.pop();
		if (node.directive !== undefined) starts.add(node.expression.start);
		stack.push(...childNodesOf(node));
	}
	return starts;
};

/**
 * The respellings in groups that write no site in common, so one minify of a
 * program respelled by every member of a group asks them all.
 * @param {Respelling[]} respellings the respellings asked
 * @param {Site[]} sites every site of the program
 * @returns {Respelling[][]} the groups, in the order their first member is asked
 */
const disjointGroups = (respellings, sites) => {
	/** @type {{ members: Respelling[], written: Set<Site> }[]} */
	const groups = [];
	for (const respelling of respellings) {
		const written = sites.filter((site) => respelling.write(site) !== null);
		let group = groups.find(
			(one) => !written.some((site) => one.written.has(site))
		);
		if (group === undefined) {
			group = { members: [], written: new Set() };
			groups.push(group);
		}
		group.members.push(respelling);
		for (const site of written) group.written.add(site);
	}
	return groups.map((group) => group.members);
};

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
	const directives = directiveStarts(code, module);
	/** @type {Site[]} */
	const sites = tokens.map((token) => ({
		label: token.label,
		text: code.slice(token.start, token.end),
		start: token.start,
		end: token.end,
		directive: directives.has(token.start)
	}));
	// Each group at once costs one minify, and only a program that moves pays
	// one per respelling of the group.
	/** @type {Respelling[]} */
	const moving = [];
	for (const group of disjointGroups(
		JS_RESPELLINGS.filter((one) => wantedRespelling(one.name)),
		sites
	)) {
		/** @type {Respelling} */
		const every = {
			name: "every",
			write: (site) => {
				for (const respelling of group) {
					const written = respelling.write(site);
					if (written !== null) return written;
				}
				return null;
			}
		};
		if (spellingFinding(minify, code, module, minified, sites, every) !== null) {
			moving.push(...group);
		}
	}
	for (const respelling of moving) {
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

// What `jsMeaning` leaves out of a node: its range and how its literal or
// number was spelled.
const SPELLING_KEYS = new Set([...NOT_CHILD_KEYS, "raw", "bigint"]);

// The statements whose body a block of one statement means the same as, and
// the keys that body sits under.
const BODY_KEYS = new Map([
	["IfStatement", new Set(["consequent", "alternate"])],
	["ForStatement", new Set(["body"])],
	["ForInStatement", new Set(["body"])],
	["ForOfStatement", new Set(["body"])],
	["WhileStatement", new Set(["body"])],
	["DoWhileStatement", new Set(["body"])],
	["LabeledStatement", new Set(["body"])],
	["WithStatement", new Set(["body"])]
]);

// The keys holding a statement list, whose empty statements say nothing.
const STATEMENT_LISTS = new Set(["body", "consequent"]);

/**
 * @param {EXPECTED_ANY} statement a statement
 * @returns {boolean} whether a block around it scopes what it declares
 */
const declaresInBlock = (statement) =>
	statement.type === "FunctionDeclaration" ||
	statement.type === "ClassDeclaration" ||
	(statement.type === "VariableDeclaration" && statement.kind !== "var");

/**
 * @param {EXPECTED_ANY} node a node
 * @returns {boolean} whether it is `1/0`, the printer's spelling of Infinity
 */
const isOneOverZero = (node) =>
	node.type === "BinaryExpression" &&
	node.operator === "/" &&
	node.left.type === "Literal" &&
	node.left.value === 1 &&
	node.right.type === "Literal" &&
	node.right.value === 0;

/**
 * The name a key or member stands for, where it is a plain name however it is
 * written: `a`, `"a"` and `["a"]` name the same property.
 * @param {EXPECTED_ANY} key a key, a member's property or a specifier's name
 * @returns {string | null} the name, or null where an expression computes it
 */
const nameOf = (key) => {
	if (key.type === "Identifier") return key.name;
	if (isOneOverZero(key)) return "Infinity";
	return key.type === "Literal" && key.regex === undefined
		? String(key.value)
		: null;
};

/**
 * One node as what it means: its type and every value it carries, its range and
 * spelling set aside, so a source and its print read alike where they mean the
 * same.
 *
 * WHY: the printer writes several trees one way, each meaning what the other
 * does: a quoted or computed key as a name, `1e500` as `1/0`, `(a,(b,c))` as
 * `a,b,c`, `() => { return a }` as `() => a`, a lone statement's block as the
 * statement, a regexp's flags sorted. Each is read here as the form it means.
 * @param {EXPECTED_ANY} node an ESTree node
 * @param {EXPECTED_ANY} parent the node holding it, null for the program
 * @param {string} key the key it sits under
 * @param {WeakSet<object>} tagged the template literals a tag reads raw
 * @returns {string} what it means
 */
const nodeMeaning = (node, parent, key, tagged) => {
	if (node === null) return "null";
	// Read under `preserveParens`, a parenthesis is spelling too.
	if (node.type === "ParenthesizedExpression") {
		return nodeMeaning(node.expression, parent, key, tagged);
	}
	const bodyKeys = parent === null ? undefined : BODY_KEYS.get(parent.type);
	if (
		node.type === "BlockStatement" &&
		bodyKeys !== undefined &&
		bodyKeys.has(key)
	) {
		const kept = node.body.filter(
			(/** @type {EXPECTED_ANY} */ one) => one.type !== "EmptyStatement"
		);
		if (kept.length === 0) return "(EmptyStatement)";
		if (kept.length === 1 && !declaresInBlock(kept[0])) {
			return nodeMeaning(kept[0], parent, key, tagged);
		}
	}
	if (isOneOverZero(node)) return "(Literal value=Infinity)";
	if (
		node.type === "BinaryExpression" &&
		node.operator === "/" &&
		node.left.type === "UnaryExpression" &&
		node.left.operator === "-" &&
		isOneOverZero({ ...node, left: node.left.argument })
	) {
		const infinity = { type: "Literal", value: Infinity };
		return nodeMeaning(
			{ type: "UnaryExpression", operator: "-", prefix: true, argument: infinity },
			parent,
			key,
			tagged
		);
	}
	if (node.type === "Literal" && node.regex !== undefined) {
		// The printer escapes a NUL the source wrote raw or as `\<NUL>`, and drops
		// the escape of a `/` in a class or of a non-ASCII character (Annex B's
		// identity escape), neither of which needs one.
		const pattern = node.regex.pattern.replace(
			/\\([\s\S])|\0(?![0-9])/g,
			/**
			 * @param {string} written the escape or NUL as written
			 * @param {string | undefined} escaped what a backslash escapes
			 * @returns {string} the spelling the printer gives it
			 */
			(written, escaped) =>
				escaped === undefined || escaped === "\0"
					? "\\0"
					: escaped === "/" || escaped.charCodeAt(0) > 0x7f
						? escaped
						: written
		).replace(
			/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
			/**
			 * A lone surrogate prints as its `\u` escape, which names the same.
			 * @param {string} lone the surrogate
			 * @returns {string} its escape
			 */
			(lone) => `\\u${lone.charCodeAt(0).toString(16)}`
		);
		const flags = node.regex.flags.split("").sort().join("");
		return `(Literal regex=${JSON.stringify(pattern)} flags=${flags})`;
	}
	if (node.type === "SequenceExpression") {
		/** @type {EXPECTED_ANY[]} */
		const flat = [];
		/**
		 * @param {EXPECTED_ANY} one an expression of the sequence
		 * @returns {void}
		 */
		const add = (one) => {
			if (one.type === "SequenceExpression") one.expressions.forEach(add);
			else flat.push(one);
		};
		node.expressions.forEach(add);
		return `(SequenceExpression ${flat
			.map((one) => nodeMeaning(one, node, "expressions", tagged))
			.join(" ")})`;
	}
	if (
		node.type === "ArrowFunctionExpression" &&
		!node.expression &&
		node.body.body.length === 1 &&
		node.body.body[0].type === "ReturnStatement" &&
		node.body.body[0].argument !== null
	) {
		return nodeMeaning(
			{ ...node, expression: true, body: node.body.body[0].argument },
			parent,
			key,
			tagged
		);
	}
	if (
		/^(?:Arrow)?Function(?:Declaration|Expression)$/.test(node.type) &&
		!node.expression
	) {
		const list = node.body.body;
		const last = list[list.length - 1];
		// A bare `return` ending a function returns what its end would.
		if (last && last.type === "ReturnStatement" && last.argument === null) {
			return nodeMeaning(
				{ ...node, body: { ...node.body, body: list.slice(0, -1) } },
				parent,
				key,
				tagged
			);
		}
	}
	// A class exported as the default has the same name either way.
	if (
		node.type === "ExportDefaultDeclaration" &&
		node.declaration.type === "ClassExpression"
	) {
		return nodeMeaning(
			{ ...node, declaration: { ...node.declaration, type: "ClassDeclaration" } },
			parent,
			key,
			tagged
		);
	}
	if (node.type === "TaggedTemplateExpression") tagged.add(node.quasi);
	const keyed =
		/^(?:Property|MethodDefinition|PropertyDefinition|ImportAttribute)$/.test(
			node.type
		);
	let out = `(${node.type}`;
	for (const field of Object.keys(node)) {
		if (SPELLING_KEYS.has(field)) continue;
		const value = node[field];
		if (field === "directive") {
			// Of every directive, only `use strict` does anything.
			if (value === "use strict") out += " use-strict";
			continue;
		}
		if (keyed && (field === "shorthand" || field === "computed")) continue;
		if (node.type === "MemberExpression" && field === "computed") continue;
		if (
			(keyed && field === "key") ||
			(node.type === "MemberExpression" && field === "property") ||
			(/Specifier$/.test(node.type) && value !== null)
		) {
			const name =
				node.computed && value.type !== "Literal" && !isOneOverZero(value)
					? null
					: nameOf(value);
			if (name !== null) {
				out += ` ${field}=${JSON.stringify(name)}${keyMarker(node, parent, name)}`;
				continue;
			}
		}
		if (value === null || typeof value !== "object") {
			out += ` ${field}=${
				typeof value === "string"
					? JSON.stringify(value)
					: `${String(value)}${typeof value === "bigint" ? "n" : ""}`
			}`;
		} else if (Array.isArray(value)) {
			const items = STATEMENT_LISTS.has(field)
				? value.filter(
						(/** @type {EXPECTED_ANY} */ one) =>
							one === null || one.type !== "EmptyStatement"
					)
				: value;
			out += ` ${field}[${items
				.map((/** @type {EXPECTED_ANY} */ one) =>
					nodeMeaning(one, node, field, tagged)
				)
				.join(" ")}]`;
		} else if (typeof value.type === "string") {
			out += ` ${field}:${nodeMeaning(value, node, field, tagged)}`;
		} else {
			for (const inner of Object.keys(value)) {
				// An untagged template's raw text is spelling: only a tag reads it.
				if (inner === "raw" && !tagged.has(parent)) continue;
				out += ` ${field}.${inner}=${JSON.stringify(String(value[inner]))}`;
			}
		}
	}
	return `${out})`;
};

/**
 * What a plain key means beyond its name: in an object literal `__proto__: v`
 * sets the prototype where every other spelling defines a property, and in a
 * class a computed `constructor` or `prototype` is a member like any other.
 * @param {EXPECTED_ANY} node the property, method or field
 * @param {EXPECTED_ANY} parent what holds it
 * @param {string} name the name its key stands for
 * @returns {string} the marker, empty where the name says it all
 */
const keyMarker = (node, parent, name) => {
	if (
		node.type === "Property" &&
		parent.type === "ObjectExpression" &&
		name === "__proto__" &&
		!node.computed &&
		!node.shorthand &&
		!node.method &&
		node.kind === "init"
	) {
		return " sets-prototype";
	}
	if (
		node.type !== "Property" &&
		node.computed &&
		(name === "constructor" || name === "prototype")
	) {
		return " computed";
	}
	return "";
};

/**
 * What a program means, as webpack's parser reads it under one goal.
 * @param {string} code a program
 * @param {EXPECTED_ANY} options what to parse it as
 * @returns {string | null} its meaning, or null where it does not parse
 */
const jsMeaning = (code, options) => {
	/** @type {EXPECTED_ANY} */
	let root;
	try {
		root = webpackParse(code, options);
	} catch (_error) {
		return null;
	}
	return nodeMeaning(root, null, "", new WeakSet());
};

// The last source read for `meaning`, under which options, and what it
// means: two presets ask it.
/** @type {string | undefined} */
let lastMeaningSource;
/** @type {EXPECTED_ANY} */
let lastMeaningOptions;
/** @type {string | null} */
let lastMeaning = null;

/**
 * Whether a program printed alone means what its source does (`meaning`): a
 * compressing print changes the tree by contract, so only `behavior` and
 * `notices` hold it.
 * @param {string} source the program
 * @param {string} printed what the preset printed of it
 * @param {EXPECTED_ANY} options what both are parsed as
 * @returns {import("./relations").Report[]} what it means otherwise
 */
const meaningReports = (source, printed, options) => {
	if (source !== lastMeaningSource || options !== lastMeaningOptions) {
		lastMeaningSource = source;
		lastMeaningOptions = options;
		lastMeaning = jsMeaning(source, options);
	}
	if (lastMeaning === null) return [];
	return meaningRelation(lastMeaning, jsMeaning(printed, options));
};

// The comments terser and webpack's printer both keep: a `/*!` or `//!`
// notice, and one naming `@license` or `@preserve`.
const LEGAL_NOTICE = /^\**!|@license|@preserve/i;

/**
 * The legal notices a program carries, read by acorn. A compressing print
 * owes only its banner, the notices before its first token: one inside code
 * the compressor removes goes with that code, as terser drops it too.
 * @param {boolean} module whether the text is a module
 * @param {boolean} banner whether only the notices before the first token count
 * @returns {(code: string) => number | null} how many a program carries, null where acorn refuses it
 */
const legalNotices = (module, banner) => (code) => {
	/** @type {number[]} */
	const ends = [];
	let first = Infinity;
	try {
		acornParse(code, {
			ecmaVersion: "latest",
			sourceType: module ? "module" : "script",
			allowHashBang: true,
			onComment: (block, text, start, end) => {
				if (LEGAL_NOTICE.test(text)) ends.push(end);
			},
			onToken: (token) => {
				if (first === Infinity) first = token.start;
			}
		});
	} catch (_error) {
		return null;
	}
	return banner ? ends.filter((end) => end <= first).length : ends.length;
};

// The scripts `behavior` runs: short enough that a run costs little, and
// bounded so one that loops is skipped rather than hanging the sweep.
const BEHAVIOR_MAX_LENGTH = 20000;
const BEHAVIOR_TIMEOUT = 200;
// Every run reads the same clock and random numbers, so a script reading them
// still answers for its printed form.
const BEHAVIOR_PRELUDE =
	"Math.random = () => 0.5;" +
	"Date = new Proxy(Date, { construct: (D, a) => new D(...(a.length ? a : [0])), apply: (D) => String(new D(0)) });" +
	"Date.now = () => 0;";

/**
 * What a script prints and, where it throws, the error's kind and message or the
 * thrown value, run in a fresh context: a function prints as `[function]`, as
 * its text is the printer's.
 * @param {string} code the script
 * @returns {string | null} its transcript, null where it timed out
 */
const behaviorOf = (code) => {
	/** @type {string[]} */
	const lines = [];
	/**
	 * @param {unknown} value a logged value
	 * @returns {string} it, as the transcript holds it
	 */
	const show = (value) =>
		typeof value === "function" ? "[function]" : String(value);
	const context = vm.createContext({
		console: {
			log: (/** @type {unknown[]} */ ...values) =>
				lines.push(values.map(show).join(" "))
		}
	});
	vm.runInContext(BEHAVIOR_PRELUDE, context);
	try {
		vm.runInContext(code, context, { timeout: BEHAVIOR_TIMEOUT });
	} catch (error) {
		try {
			const isObject = error !== null && typeof error === "object";
			const {
				code: reason,
				name,
				message
			} = /** @type {{ code?: unknown, name?: unknown, message?: unknown }} */ (
				isObject ? error : {}
			);
			if (reason === "ERR_SCRIPT_EXECUTION_TIMEOUT") return null;
			const kind = typeof name === "string" ? name : typeof error;
			// JavaScriptCore quotes the failing source text, which a printer may
			// rewrite, as `(evaluating '…')`; V8 never writes it.
			const value =
				typeof message === "string"
					? message.replace(/ \(evaluating '[\s\S]*'\)$/, "")
					: isObject
						? ""
						: show(error);
			lines.push(`threw <${kind}>${value ? ` ${value}` : ""}`);
		} catch (_error) {
			// A thrown object whose own properties throw when read.
			lines.push("threw <unreadable>");
		}
	}
	return lines.join("\n");
};

// The last source run and its transcript: every preset asks of the same source.
/** @type {string | undefined} */
let lastSource;
/** @type {string | null} */
let lastExpected = null;

/**
 * Whether a printed script still prints and throws what its source does.
 * @param {string} source the script
 * @param {string} printed what the printer wrote of it
 * @returns {import("./relations").Report[] | null} what differs, empty where it runs the same, null where it was not run
 */
const behaviorDifference = (source, printed) => {
	if (source.length > BEHAVIOR_MAX_LENGTH) return null;
	if (source !== lastSource) {
		lastSource = source;
		lastExpected = behaviorOf(source);
		// A script whose two runs differ answers for nothing.
		if (lastExpected !== null && behaviorOf(source) !== lastExpected) {
			lastExpected = null;
		}
	}
	const expected = lastExpected;
	if (expected === null) return null;
	let got = behaviorOf(printed);
	// A run times out under a loaded machine too, so one runs again before it counts.
	if (got === null) got = behaviorOf(printed);
	if (got === expected) return [];
	return [
		{
			relation: "behavior",
			what: got === null ? "times out" : "runs otherwise",
			repro: `    ${oneLine(expected, 80)}\n      -> ${
				got === null ? "<timeout>" : oneLine(got, 80)
			}`
		}
	];
};

/** @type {import("./index").SyntaxInvariants} */
const invariants = {
	printers: (source) => {
		const module = isModule(source);
		// Read as a build reads it, at the latest edition.
		if (module === null || !parsesAsLatest(source, module)) return [];
		const goal = goalFor(source);
		return PRESETS.map(([name, options]) => {
			const { minify, reprint } = printerFor(minifyOnePass, options, module);
			const alone = options.compress === false;
			const notices = legalNotices(module, !alone);
			return {
				name,
				minify,
				reprint,
				says: (text) => tokenMeaning(text, module),
				// Compressed or renamed, what a script observes may change by
				// contract; printed alone, nothing it does may.
				keeps: (text, printed) => [
					...noticeRelation(notices, text, printed),
					...(alone ? meaningReports(text, printed, goal) : []),
					...((!module && alone && behaviorDifference(text, printed)) || [])
				]
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
	behaviorDifference,
	goalFor,
	jsMeaning,
	jsPurityDigest,
	jsSlices,
	jsSpans,
	legalNotices,
	meaningReports,
	minifyOnePass,
	parsesAsLatest,
	printerFor,
	spansEitherGoal,
	sweepRespellings,
	tokenMeaning
};
