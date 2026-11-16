/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const vm = require("vm");
const { parse: acornParse } = require("acorn");
const { isStackOverflow } = require("../fixture");
const { estree: webpackParse } = require("../javascriptParse");
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
		/** @type {import("../javascriptParse").EstreeParseOptions} */
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
		// One at a time: a program's statements can outnumber what a call takes.
		for (const child of childNodesOf(node)) stack.push(child);
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
	// An anonymous class exported as the default has the same name either way;
	// only the declaration of a named one binds its name in the module.
	if (
		node.type === "ExportDefaultDeclaration" &&
		node.declaration.type === "ClassExpression" &&
		node.declaration.id === null
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

// The programs `behavior` runs: short enough that a run costs little, and
// bounded so one that loops is skipped rather than hanging the sweep.
const BEHAVIOR_MAX_LENGTH = 20000;
const BEHAVIOR_TIMEOUT = 200;
// The most wall time a run short of the machine is given: with the tries
// before it, 17 s, inside the 30 s a test may take.
const BEHAVIOR_MAX_WAIT = 12800;
// The timer callbacks a run fires once its own code returns: enough for a
// chain of timeouts, short of an interval nothing clears.
const BEHAVIOR_MAX_TIMERS = 100;
// The CPU time this thread has spent, which a machine busy elsewhere or paused
// does not add to; Node.js before 23.9 reads only the whole process's.
const cpuTime =
	typeof process.threadCpuUsage === "function"
		? () => process.threadCpuUsage()
		: () => process.cpuUsage();
// The global a run fires its next due timer through, from a script of its own,
// so the callback runs under the run's timeout and its reactions drain after;
// and the one the prelude takes the host's word that a timer is due through.
const TIMER_STEP = "__webpackBehaviorTimer";
const TIMER_HOOK = "__webpackBehaviorTimed";
// Every run reads the same clock and random numbers, so a program reading them
// still answers for its print, and fake timers firing in their delays' order;
// the prelude ends on the context's `Promise.prototype`.
const BEHAVIOR_PRELUDE =
	"Math.random = () => 0.5;" +
	"Date = new Proxy(Date, { construct: (D, a) => new D(...(a.length ? a : [0])), apply: (D) => String(new D(0)) });" +
	"Date.now = () => 0;" +
	"(() => {" +
	`const timed = globalThis.${TIMER_HOOK}; delete globalThis.${TIMER_HOOK};` +
	"const resolved = Promise.resolve(), due = []; let clock = 0, last = 0;" +
	"const add = (f, ms, args, every) => { const id = ++last; const wait = Math.max(0, Number(ms) || 0);" +
	"if (typeof f === 'function') { timed(); due.push({ id, at: clock + wait, f, args, every: every ? Math.max(1, wait) : 0 }); } return id; };" +
	"const clear = (id) => { const at = due.findIndex((one) => one.id === id); if (at !== -1) due.splice(at, 1); };" +
	"setTimeout = (f, ms, ...args) => add(f, ms, args, false);" +
	"setInterval = (f, ms, ...args) => add(f, ms, args, true);" +
	"setImmediate = (f, ...args) => add(f, 0, args, false);" +
	"clearTimeout = clearInterval = clearImmediate = clear;" +
	"queueMicrotask = (f) => { resolved.then(() => f()); };" +
	`Object.defineProperty(globalThis, "${TIMER_STEP}", { value: () => {` +
	"if (due.length === 0) return false; let next = 0;" +
	"for (let i = 1; i < due.length; i++) if (due[i].at < due[next].at || (due[i].at === due[next].at && due[i].id < due[next].id)) next = i;" +
	"const timer = due[next]; clock = timer.at;" +
	"if (timer.every) timer.at += timer.every; else due.splice(next, 1);" +
	"timer.f(...timer.args); return true; } });" +
	"})();" +
	"Promise.prototype;";

// Each compiled once, on the first run that needs it.
/** @type {vm.Script | undefined} */
let prelude;
/** @type {vm.Script | undefined} */
let timerStep;
/** @type {vm.Script | undefined} */
let builtInWatch;

/**
 * An `import()` the run makes stays pending: no module can be loaded, and a
 * rejection nothing handles would end the test worker.
 * @returns {Promise<never>} a promise that never settles
 */
const importNothing = () => new Promise(() => {});

// The `Promise.prototype` of each context a run made, so a rejection one leaves
// unhandled is told from the process's own.
/** @type {WeakSet<EXPECTED_OBJECT>} */
const runPromises = new WeakSet();
let rejectionsHeard = false;

/**
 * A rejection a run leaves unhandled, reported after the run has returned: one
 * of the run's is the program's own business, any other the process's.
 * @param {unknown} reason why it was rejected
 * @param {Promise<unknown>} promise the promise
 * @returns {void}
 */
const onRejection = (reason, promise) => {
	if (runPromises.has(Object.getPrototypeOf(promise))) return;
	// Alone, this listener stands where Node.js would throw.
	if (process.listenerCount("unhandledRejection") === 1) throw reason;
};

// Run in a context after the prelude, before the program: what the program
// replaces of the built-ins, every global's own properties and its prototype's,
// is answered by the function it ends on. A binding it adds is its own.
const BUILT_IN_WATCH =
	"(() => {" +
	"const own = (o) => Reflect.ownKeys(o).map((k) => [k, Reflect.getOwnPropertyDescriptor(o, k)]);" +
	"const same = (a, b) => a !== undefined && Object.is(a.value, b.value) && a.get === b.get && a.set === b.set;" +
	"const owners = [];" +
	"for (const [, d] of own(globalThis)) { const v = d.value;" +
	"if (v !== globalThis && ((typeof v === 'object' && v !== null) || typeof v === 'function')) { owners.push(v);" +
	"const p = typeof v === 'function' && Reflect.getOwnPropertyDescriptor(v, 'prototype');" +
	"if (p && typeof p.value === 'object' && p.value !== null) owners.push(p.value); } }" +
	"const globals = own(globalThis), before = owners.map(own);" +
	"const kept = (o, list, grows) => (grows || Reflect.ownKeys(o).length === list.length) && list.every(([k, d]) => same(Reflect.getOwnPropertyDescriptor(o, k), d));" +
	"return () => !kept(globalThis, globals, true) || owners.some((o, i) => !kept(o, before[i], false));" +
	"})()";

/**
 * What one run of a program answers.
 * @typedef {object} BehaviorAnswer
 * @property {string | null | undefined} transcript what it printed and threw, null where it timed out, undefined where it cannot run here
 * @property {boolean} patched whether it replaced or added to a built-in, read only where the run watches them
 */

/**
 * Whether this Node.js runs a module in a context and links it synchronously:
 * `--experimental-vm-modules`, and `linkRequests` from Node.js 22.21 and 24.8.
 * @returns {boolean} whether it does
 */
const runsModules = () =>
	typeof vm.SourceTextModule === "function" &&
	typeof vm.SourceTextModule.prototype.linkRequests === "function";

/**
 * One run of a program, in a context of its own, for {@link behaviorOf}: its
 * own code, then the promise reactions and timers it leaves, in their order.
 * @param {string} code the program
 * @param {number} timeout how long each step may run, in milliseconds of wall time
 * @param {boolean} module whether it is a module
 * @param {boolean} watch whether to read what it replaces of the built-ins
 * @returns {BehaviorAnswer} what it answers
 */
const runBehavior = (code, timeout, module, watch) => {
	/** @type {string[]} */
	const lines = [];
	/**
	 * @param {unknown} value a logged value
	 * @returns {string} it, as the transcript holds it
	 */
	const show = (value) =>
		typeof value === "function" ? "[function]" : String(value);
	let timed = false;
	const context = vm.createContext(
		{
			console: {
				log: (/** @type {unknown[]} */ ...values) =>
					lines.push(values.map(show).join(" "))
			},
			[TIMER_HOOK]: () => {
				timed = true;
			}
		},
		// Its own microtask queue, drained after each step and inside its timeout.
		{ microtaskMode: "afterEvaluate" }
	);
	if (prelude === undefined) prelude = new vm.Script(BEHAVIOR_PRELUDE);
	runPromises.add(prelude.runInContext(context));
	if (!rejectionsHeard) {
		rejectionsHeard = true;
		process.on("unhandledRejection", onRejection);
	}
	if (watch && builtInWatch === undefined) {
		builtInWatch = new vm.Script(BUILT_IN_WATCH);
	}
	const patched = watch
		? /** @type {() => boolean} */ (
				/** @type {vm.Script} */ (builtInWatch).runInContext(context)
			)
		: () => false;
	/**
	 * @param {string | null | undefined} transcript what the run answers
	 * @returns {BehaviorAnswer} it, with whether the program patched a built-in
	 */
	const answer = (transcript) => ({
		transcript,
		patched: typeof transcript === "string" && patched()
	});
	/**
	 * @param {unknown} error what a step threw
	 * @param {string=} verb how the transcript notes it
	 * @returns {boolean} false where it timed out, after noting anything else in the transcript
	 */
	const threw = (error, verb = "threw") => {
		try {
			const isObject = error !== null && typeof error === "object";
			const {
				code: reason,
				name,
				message
			} = /** @type {{ code?: unknown, name?: unknown, message?: unknown }} */ (
				isObject ? error : {}
			);
			if (reason === "ERR_SCRIPT_EXECUTION_TIMEOUT") return false;
			const kind = typeof name === "string" ? name : typeof error;
			// JavaScriptCore quotes the failing source text, which a printer may
			// rewrite, as `(evaluating '…')` and as the operand `in` refuses
			// (`010 is not an Object.`); V8 quotes a class's heritage as its text.
			const value =
				typeof message === "string"
					? message
							.replace(
								/^[\s\S]* (is not an Object\.) \(evaluating '[\s\S]*'\)$/,
								"$1"
							)
							.replace(/ \(evaluating '[\s\S]*'\)$/, "")
							.replace(
								/^(Class extends value) [\s\S]* (is not a constructor or null)$/,
								"$1 $2"
							)
					: isObject
						? ""
						: show(error);
			lines.push(`${verb} <${kind}>${value ? ` ${value}` : ""}`);
		} catch (_error) {
			// A thrown object whose own properties throw when read.
			lines.push(`${verb} <unreadable>`);
		}
		return true;
	};
	/** @type {vm.SourceTextModule | undefined} */
	let evaluated;
	if (module) {
		if (!runsModules()) return answer(undefined);
		/** @type {vm.SourceTextModule} */
		let linked;
		try {
			linked = new vm.SourceTextModule(code, {
				context,
				importModuleDynamically: importNothing
			});
		} catch (error) {
			threw(error, "refused");
			return answer(lines.join("\n"));
		}
		// A module importing another is not run: no fixture is its dependency.
		if (linked.moduleRequests.length > 0) return answer(undefined);
		linked.linkRequests([]);
		linked.instantiate();
		evaluated = linked;
		const start = Date.now();
		try {
			// What it awaits at the top level drains inside `evaluate`, and how it
			// fails is read off `status`.
			linked.evaluate({ timeout }).catch(() => {});
		} catch (error) {
			if (!threw(error)) return answer(null);
			evaluated = undefined;
		}
		// WHY: a module cut off at its timeout says so only in a rejection read
		// after this returns, so a run that took it all is taken as cut off.
		if (Date.now() - start >= timeout) return answer(null);
	} else {
		/** @type {vm.Script} */
		let script;
		try {
			script = new vm.Script(code, { importModuleDynamically: importNothing });
		} catch (error) {
			threw(error, "refused");
			return answer(lines.join("\n"));
		}
		try {
			script.runInContext(context, { timeout });
		} catch (error) {
			if (!threw(error)) return answer(null);
		}
	}
	/**
	 * @returns {boolean} false where the module's evaluation timed out, after noting how it failed
	 */
	const moduleFailed = () => {
		if (evaluated === undefined || evaluated.status !== "errored") return true;
		const { error } = evaluated;
		evaluated = undefined;
		return threw(error);
	};
	if (!moduleFailed()) return answer(null);
	if (timed) {
		if (timerStep === undefined) timerStep = new vm.Script(`${TIMER_STEP}()`);
		for (let fired = 0; fired < BEHAVIOR_MAX_TIMERS; fired++) {
			try {
				if (!timerStep.runInContext(context, { timeout })) break;
			} catch (error) {
				if (!threw(error)) return answer(null);
			}
		}
	}
	// A top-level `await` a timer settles fails only once it has fired.
	if (!moduleFailed()) return answer(null);
	return answer(lines.join("\n"));
};

/**
 * {@link behaviorOf} on this thread.
 * @param {string} code the program
 * @param {boolean} module whether it is a module
 * @param {boolean} watch whether to read what it replaces of the built-ins
 * @returns {BehaviorAnswer} what it answers
 */
const behaviorHere = (code, module, watch) => {
	let wait = BEHAVIOR_TIMEOUT;
	for (;;) {
		const start = cpuTime();
		const answered = runBehavior(code, wait, module, watch);
		if (answered.transcript !== null) return answered;
		const end = cpuTime();
		const spent = (end.user - start.user + end.system - start.system) / 1000;
		// WHY: `timeout` is wall time, which a loaded or paused machine spends on
		// other work. A run that spent under half of it on its own ran short of
		// the machine, not of time, so it runs again for longer.
		if (spent >= BEHAVIOR_TIMEOUT / 2 || wait >= BEHAVIOR_MAX_WAIT) {
			return answered;
		}
		wait *= 4;
	}
};

// Module runs a worker makes before it is replaced: V8 never collects a context
// a module was compiled in, about 150 KB each, so they go with their thread.
const MODULE_RUNS_PER_WORKER = 500;
// How long a worker's answer is waited for: past every retry `behaviorHere` makes.
const MODULE_RUN_WAIT = 60000;

/**
 * The thread modules run on, with the port it answers on, the word it flips once
 * it has, and how many runs it has made.
 * @typedef {object} ModuleRunner
 * @property {import("worker_threads").Worker} worker the thread
 * @property {import("worker_threads").MessagePort} port where it answers
 * @property {Int32Array} answered 1 once it has answered the last run
 * @property {number} runs how many runs it has made
 */

/** @type {ModuleRunner | undefined} */
let moduleRunner;

/**
 * The code a module runner's thread runs: each message is a module and whether
 * to watch the built-ins, answered once the word is flipped.
 * @returns {string} the worker's source
 */
const moduleRunnerSource = () =>
	"const { workerData } = require('worker_threads');" +
	`const { behaviorOf } = require(${JSON.stringify(__filename)});` +
	"const { port, answered } = workerData;" +
	"port.on('message', ([code, watch]) => {" +
	"let reply; try { reply = behaviorOf(code, true, watch); } catch (_error) { reply = { transcript: undefined, patched: false }; }" +
	"port.postMessage(reply); Atomics.store(answered, 0, 1); Atomics.notify(answered, 0); });";

/**
 * {@link behaviorOf} of a module, on a thread of its own that is replaced
 * every {@link MODULE_RUNS_PER_WORKER} runs, waited for synchronously.
 * @param {string} code the module
 * @param {boolean} watch whether to read what it replaces of the built-ins
 * @returns {BehaviorAnswer} what it answers
 */
const moduleBehavior = (code, watch) => {
	const { MessageChannel, Worker, receiveMessageOnPort } = require("worker_threads");

	if (moduleRunner !== undefined && moduleRunner.runs >= MODULE_RUNS_PER_WORKER) {
		moduleRunner.worker.terminate();
		moduleRunner = undefined;
	}
	if (moduleRunner === undefined) {
		const { port1, port2 } = new MessageChannel();
		const answered = new Int32Array(new SharedArrayBuffer(4));
		const worker = new Worker(moduleRunnerSource(), {
			eval: true,
			// Without the flag's warning on every new thread.
			execArgv: ["--experimental-vm-modules", "--no-warnings"],
			workerData: { port: port2, answered },
			transferList: [port2]
		});
		worker.unref();
		port1.unref();
		moduleRunner = { worker, port: port1, answered, runs: 0 };
	}
	const runner = moduleRunner;
	runner.runs++;
	Atomics.store(runner.answered, 0, 0);
	runner.port.postMessage([code, watch]);
	if (Atomics.wait(runner.answered, 0, 0, MODULE_RUN_WAIT) === "timed-out") {
		runner.worker.terminate();
		moduleRunner = undefined;
		return { transcript: null, patched: false };
	}
	const reply = receiveMessageOnPort(runner.port);
	return reply === undefined
		? { transcript: undefined, patched: false }
		: /** @type {BehaviorAnswer} */ (reply.message);
};

/**
 * What a program prints and, where it throws, the error's kind and message or
 * the thrown value, run in a fresh context with the promise reactions and timers
 * it leaves: a function prints as `[function]`, as its text is the printer's.
 * A program V8 refuses to compile answers `refused` and its error.
 * @param {string} code the program
 * @param {boolean} module whether it is a module
 * @param {boolean=} watch whether to read what it replaces of the built-ins
 * @returns {BehaviorAnswer} what it answers
 */
const behaviorOf = (code, module, watch = false) => {
	if (!module || !require("worker_threads").isMainThread) {
		return behaviorHere(code, module, watch);
	}
	// Run without the flag, or by a runtime without `vm` modules, no thread is started.
	return runsModules()
		? moduleBehavior(code, watch)
		: { transcript: undefined, patched: false };
};

// Built-ins a self-contained program may not read, as what they answer is not
// the program's: code it builds from text, the global object's own keys, and
// what the collector decides.
const UNCONTAINED_GLOBALS = new Set([
	"eval",
	"Function",
	"globalThis",
	"WeakRef",
	"FinalizationRegistry",
	TIMER_STEP
]);
// Names reading what compressing and mangling change by contract: a function's
// name and text, the call stack, and the calls an error records.
const CONTRACT_NAMES = new Set([
	"name",
	"toString",
	"toSource",
	"stack",
	"caller",
	"callee"
]);

/** @type {Set<string> | undefined} */
let sandboxGlobals;

/**
 * Whether a program reads nothing compressing and mangling may change by
 * contract: no name it leaves unbound beyond the run's built-ins, no `with`, no
 * code built from text and no function's name or text. Its run tells whether
 * it replaces a built-in, which the compressor takes as native.
 * @param {string} code the program
 * @param {boolean} module whether it is a module
 * @returns {boolean} whether its compressed print owes its behavior
 */
const selfContained = (code, module) => {
	const tokens = tokensOf(code, module);
	if (tokens === null) return false;
	for (const { label, value } of tokens) {
		if (label === "with") return false;
		if (label === "name" && CONTRACT_NAMES.has(value)) return false;
	}
	if (sandboxGlobals === undefined) {
		const context = vm.createContext({ console: {}, [TIMER_HOOK]: () => {} });
		vm.runInContext(BEHAVIOR_PRELUDE, context);
		sandboxGlobals = new Set(
			/** @type {string[]} */ (
				vm.runInContext("Object.getOwnPropertyNames(globalThis)", context)
			).filter((name) => !UNCONTAINED_GLOBALS.has(name))
		);
	}

	const { parser, scopes } = require("../../../lib/javascript/syntax");

	const log = new scopes.ScopeLog();
	const program = parser.parseProgram(code, 0, {
		sourceType: module ? "module" : "script",
		ecmaVersion: "latest",
		allowHashBang: true,
		scopes: log
	});
	const known = /** @type {Set<string>} */ (sandboxGlobals);
	return scopes
		.analyzeScope(/** @type {number} */ (program))
		.unresolvedReferences.every((reference) =>
			known.has(reference.identifier.name)
		);
};

/**
 * A transcript as a compressed print owes it: an error's message only where the
 * program wrote it, as the engine's own names what mangling renames.
 * @param {string} transcript what a run printed
 * @param {string} source the program run
 * @returns {string} what its compressed print must print too
 */
const contractual = (transcript, source) =>
	transcript.replace(
		/^(threw <[^>\n]*>) ([^\n]*)$/gm,
		/**
		 * @param {string} line the line
		 * @param {string} kind its error's kind
		 * @param {string} message its message
		 * @returns {string} the line as owed
		 */
		(line, kind, message) => (source.includes(message) ? line : kind)
	);

// The last source run, as which goal, its transcript, whether it patches a
// built-in and whether it is self-contained: every preset asks of the same one.
/** @type {string | undefined} */
let lastSource;
/** @type {boolean | undefined} */
let lastModule;
/** @type {string | null} */
let lastExpected = null;
let lastPatched = false;
/** @type {boolean | undefined} */
let lastContained;

/**
 * How {@link behaviorDifference} runs a print.
 * @typedef {object} BehaviorRun
 * @property {boolean=} module whether the source is a module; where absent, only one no script parses as, as the minifier reads a print given no `sourceType` as a script
 * @property {boolean=} compressed whether the print is compressed, which owes only what a self-contained source does
 */

/**
 * Whether a printed program still prints and throws what its source does, its
 * promise reactions and timers included. A source V8 refuses, one that loops
 * and one whose two runs differ answer for nothing.
 * @param {string} source the program
 * @param {string} printed what the printer wrote of it
 * @param {BehaviorRun=} run how to run it
 * @returns {import("./relations").Report[] | null} what differs, empty where it runs the same, null where it was not run
 */
const behaviorDifference = (source, printed, run = {}) => {
	if (source.length > BEHAVIOR_MAX_LENGTH) return null;
	const asModule =
		run.module === undefined ? !parsesAsLatest(source, false) : run.module;
	// WHY: a runtime running no module here, Bun's or Deno's, runs one as a
	// script, as before modules ran: V8 refuses it alike both ways, which says
	// nothing of what it does, but a set `options.json` marks still answers.
	const asScript = asModule && !runsModules();
	if (asScript && run.compressed) return null;
	const module = asModule && !asScript;
	if (source !== lastSource || module !== lastModule) {
		lastSource = source;
		lastModule = module;
		lastContained = undefined;
		const first = behaviorOf(source, module, true);
		lastPatched = first.patched;
		lastExpected =
			typeof first.transcript === "string" &&
			(asScript || !first.transcript.startsWith("refused ")) &&
			behaviorOf(source, module).transcript === first.transcript
				? first.transcript
				: null;
	}
	if (lastExpected === null) return null;
	let expected = lastExpected;
	if (run.compressed) {
		if (lastContained === undefined) {
			lastContained = !lastPatched && selfContained(source, module);
		}
		if (!lastContained) return null;
		expected = contractual(expected, source);
	}
	const answered = behaviorOf(printed, module).transcript;
	// A print that cannot run here, as it imports, answers for nothing either.
	if (answered === undefined) return null;
	const got =
		typeof answered === "string" && run.compressed
			? contractual(answered, source)
			: answered;
	if (got === expected) return [];
	if (typeof got !== "string") {
		return [
			{
				relation: "behavior",
				what: "times out",
				repro: `    ${oneLine(expected, 80)}\n      -> <timeout>`
			}
		];
	}
	// Each side from the first line they part at, so a difference late in a
	// long transcript shows.
	const said = expected.split("\n");
	const ran = got.split("\n");
	let at = 0;
	while (at < said.length && said[at] === ran[at]) at++;
	const from = at > 0 ? "… " : "";
	return [
		{
			relation: "behavior",
			what: "runs otherwise",
			repro: `    ${from}${oneLine(said.slice(at).join("\n"), 80)}\n      -> ${from}${oneLine(ran.slice(at).join("\n"), 80)}`
		}
	];
};

/**
 * Whether an expression does nothing where its value goes unread: a literal, a
 * function or an arrow, and a collection, `void`, `!` or sign of only those.
 * @param {EXPECTED_ANY} node an ESTree expression
 * @returns {boolean} whether dropping it changes nothing
 */
const doesNothing = (node) => {
	switch (node.type) {
		case "Literal":
		case "FunctionExpression":
		case "ArrowFunctionExpression":
			return true;
		case "TemplateLiteral":
			return node.expressions.length === 0;
		case "ArrayExpression":
			return node.elements.every(
				(/** @type {EXPECTED_ANY} */ one) => one === null || doesNothing(one)
			);
		case "ObjectExpression":
			return node.properties.every(
				(/** @type {EXPECTED_ANY} */ one) =>
					one.type === "Property" &&
					!one.computed &&
					(one.kind !== "init" || one.method || doesNothing(one.value))
			);
		case "SequenceExpression":
			return node.expressions.every(doesNothing);
		case "UnaryExpression":
			if (node.operator === "void" || node.operator === "!") {
				return doesNothing(node.argument);
			}
			// A sign converts a BigInt or an object, which may throw or run code.
			return (
				(node.operator === "-" || node.operator === "~") &&
				node.argument.type === "Literal" &&
				typeof node.argument.value === "number"
			);
		default:
			return false;
	}
};

/**
 * Whether a sequence is spelled for what reading it does rather than its value:
 * `(0, a.b)()` calls without a receiver, `(0, eval)(x)` evaluates globally, and
 * `typeof (0, a)` and `delete (0, a.b)` read and drop as the bare operand would not.
 * @param {EXPECTED_ANY} parent what holds the sequence
 * @param {EXPECTED_ANY} node the sequence
 * @returns {boolean} whether its items before the last are part of what it does
 */
const readsAsOperand = (parent, node) =>
	((parent.type === "CallExpression" || parent.type === "NewExpression") &&
		parent.callee === node) ||
	(parent.type === "TaggedTemplateExpression" && parent.tag === node) ||
	(parent.type === "UnaryExpression" &&
		(parent.operator === "typeof" || parent.operator === "delete"));

/**
 * The statements and sequence items of a program that do nothing: an
 * expression statement or an unread sequence item {@link doesNothing} holds,
 * a directive and `"use strict"` aside.
 * @param {string} code a program
 * @param {boolean} module whether it is a module
 * @returns {EXPECTED_ANY[]} each such expression, empty where it does not parse
 */
const residues = (code, module) => {
	/** @type {EXPECTED_ANY} */
	let root;
	try {
		root = webpackParse(code, {
			sourceType: module ? "module" : "script",
			ecmaVersion: "latest",
			ranges: true,
			allowHashBang: true
		});
	} catch (_error) {
		return [];
	}
	/** @type {EXPECTED_ANY[]} */
	const found = [];
	/** @type {[EXPECTED_ANY, EXPECTED_ANY][]} */
	const stack = [[root, null]];
	while (stack.length > 0) {
		const [node, parent] = /** @type {[EXPECTED_ANY, EXPECTED_ANY]} */ (
			stack.pop()
		);
		if (
			node.type === "ExpressionStatement" &&
			node.directive === undefined &&
			node.expression.value !== "use strict" &&
			doesNothing(node.expression)
		) {
			found.push(node.expression);
			continue;
		}
		if (node.type === "SequenceExpression" && !readsAsOperand(parent, node)) {
			// The last item is the value, unread only as a statement.
			const unread =
				parent.type === "ExpressionStatement"
					? node.expressions
					: node.expressions.slice(0, -1);
			for (const item of unread) if (doesNothing(item)) found.push(item);
		}
		for (const child of childNodesOf(node)) stack.push([child, node]);
	}
	return found;
};

// The tokens mangling renames: a binding's name and a private name.
const RENAMED_LABELS = new Set(["name", "privateId"]);

/**
 * Where a second mangling pass names otherwise, as an idempotence finding: a
 * rename alone says so and which names moved, as the rest of what it prints
 * is the same.
 * @param {string} printed the preset's output
 * @param {string} again it mangled once more
 * @param {boolean} module whether it is a module
 * @returns {import("./relations").Report} the finding
 */
const renameReport = (printed, again, module) => {
	const before = tokensOf(printed, module);
	const after = tokensOf(again, module);
	let at = 0;
	while (at < printed.length && printed[at] === again[at]) at++;
	const where = `    ${oneLine(printed.slice(at, at + 70), 70)}\n      -> ${oneLine(again.slice(at, at + 70), 70)}`;
	if (
		before === null ||
		after === null ||
		before.length !== after.length ||
		before.some(
			(one, i) =>
				one.label !== after[i].label ||
				(!RENAMED_LABELS.has(one.label) && one.value !== after[i].value)
		)
	) {
		return {
			relation: "idempotence",
			what: `differs under mangling, ${signed(again.length - printed.length)}`,
			repro: where
		};
	}
	/** @type {Set<string>} */
	const moved = new Set();
	for (let i = 0; i < before.length; i++) {
		if (before[i].value !== after[i].value) {
			moved.add(`${before[i].value} -> ${after[i].value}`);
		}
	}
	return {
		relation: "idempotence",
		what: `renames only, under mangling, ${moved.size} name${moved.size === 1 ? "" : "s"}`,
		repro: `    rename-only: ${[...moved].slice(0, 3).join(", ")}${
			moved.size > 3 ? ", …" : ""
		}\n${where}`
	};
};

/**
 * What a compressing preset's output owes a second pass of it: the same names
 * under mangling, and no item that does nothing the preset itself drops.
 * @param {(code: string) => string} minify the preset
 * @param {(code: string) => string} mangle the preset's mangling alone
 * @param {string} printed its output
 * @param {boolean} module whether it is a module
 * @returns {import("./relations").Report[]} what a second pass moves
 */
const secondPassReports = (minify, mangle, printed, module) => {
	/** @type {import("./relations").Report[]} */
	const reports = [];
	/**
	 * @param {(code: string) => string} pass a pass
	 * @returns {string | null} what it prints of the output, null where it threw
	 */
	const again = (pass) => {
		try {
			return pass(printed);
		} catch (error) {
			if (isStackOverflow(error)) throw error;
			reports.push({
				relation: "idempotence",
				what: "threw on a second pass",
				repro: `    ${thrownText(error)}`
			});
			return null;
		}
	};
	const renamed = again(mangle);
	if (renamed !== null && renamed !== printed) {
		reports.push(renameReport(printed, renamed, module));
	}
	const left = residues(printed, module);
	if (left.length === 0) return reports;
	const shrunk = again(minify);
	if (shrunk === null || residues(shrunk, module).length >= left.length) {
		return reports;
	}
	const [first] = left;
	reports.push({
		relation: "residue",
		what: `keeps ${left.length === 1 ? "an item" : `${left.length} items`} doing nothing`,
		repro: `    ${oneLine(
			printed.slice(Math.max(0, first.start - 30), first.end + 30),
			80
		)}`
	});
	return reports;
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
			// The preset's mangling alone, which its output must already be.
			const mangle = printerFor(
				minifyOnePass,
				{
					compress: false,
					mangle: options.mangle === undefined ? true : options.mangle,
					format: options.format
				},
				module
			).minify;
			return {
				name,
				minify,
				reprint,
				says: (text) => tokenMeaning(text, module),
				// Compressed or renamed, a program may change what it observes by
				// contract, so only a self-contained one is held to what it does;
				// printed alone, nothing it does may change.
				keeps: (text, printed) => [
					...noticeRelation(notices, text, printed),
					...(alone ? meaningReports(text, printed, goal) : []),
					...(behaviorDifference(text, printed, {
						module,
						compressed: !alone
					}) || []),
					...(alone ? [] : secondPassReports(minify, mangle, printed, module))
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
	behaviorOf,
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
