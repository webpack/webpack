"use strict";

// cspell:ignore binop, fnames, propmangle, fargs, domprops, argnames, nondeferred, loopcontrol, Defun, defun, NOINLINE, Funarg, unmangleable, Unmangleable, thedef, funs

const vm = require("vm");
const {
	FORMAT_DEFAULTS,
	IGNORED_FORMAT_OPTIONS,
	createCompressHelpers,
	createUnicode,
	load,
	PHASES
} = require("../../lib/javascript/syntax").printer;
const {
	kindName,
	loadTerserSources,
	terserTypeOf,
	thrownMessage
} = require("../helpers/terserSources");

/**
 * @param {string} specifier a module's URL
 * @returns {Promise<EXPECTED_ANY>} the module, imported through this file's runtime
 */
const importTerserSource = (specifier) => import(specifier);

/**
 * terser as published, the minifier the printer is held to.
 * @returns {{ minify: typeof import("terser").minify }} it
 */
const terserReference = () => /** @type {EXPECTED_ANY} */ (require("terser"));

/**
 * Runs a minify with the `improve` phase off: terser has none, so a test
 * holding the output to terser's holds it without one.
 * @template T
 * @param {() => Promise<T>} run the minify
 * @returns {Promise<T>} what it returns
 */
const unimproved = async (run) => {
	const { improvements } = await load();
	if (!improvements) throw new Error("the improve phase is not installed");
	improvements.enabled = false;
	try {
		return await run();
	} finally {
		improvements.enabled = true;
	}
};

/**
 * Runs a minify with the `correct` phase off, which writes what terser writes
 * where terser assumes a conversion or a getter runs no code.
 * @template T
 * @param {() => Promise<T>} run the minify
 * @returns {Promise<T>} its result
 */
const uncorrected = async (run) => {
	const { corrections } = await load();
	if (!corrections) throw new Error("the correct phase is not installed");
	corrections.enabled = false;
	try {
		return await run();
	} finally {
		corrections.enabled = true;
	}
};

/** @typedef {(input: EXPECTED_ANY, options: EXPECTED_ANY) => Promise<EXPECTED_ANY>} Minifying terser's `minify` or webpack's, for what both are given */

/**
 * Calls what terser holds as a method of its nodes, which webpack's minifier
 * holds as a function of `ast` taking the node first, on a node of either tree.
 * @param {EXPECTED_ANY} ast webpack's `ast`
 * @param {EXPECTED_ANY} node a node of terser's tree or of webpack's
 * @param {string} method terser's method
 * @param {string} name webpack's function
 * @param {...EXPECTED_ANY} args the arguments
 * @returns {EXPECTED_ANY} what it returns
 */
const callNode = (ast, node, method, name, ...args) =>
	typeof node[method] === "function"
		? node[method](...args)
		: ast[name](node, ...args);

/**
 * Sources chosen for the decisions the mangler makes: which scope hands out a
 * name, and which names it may not hand out.
 * @type {[string, string, EXPECTED_OBJECT?][]}
 */
const CASES = [
	[
		"an object whose properties are hoisted into variables",
		`function area() {
			var box = { width: 2, height: 3 };
			sink(box.width, box.height);
		}
		sink(area);`
	],
	[
		"an object left whole where hoisting is off",
		`function area() {
			var box = { width: 2, height: 3 };
			sink(box.width, box.height);
		}
		sink(area);`,
		{ compress: { hoist_props: false } }
	],
	[
		"nested scopes",
		`function outer(first, second) {
			function inner(third) { return first + second + third; }
			return inner(1) + first;
		}
		sink(outer(1, 2));`
	],
	[
		"a name referenced from an inner scope",
		`const shared = 1;
		function reader() { const own = 2; return shared + own; }
		sink(reader());`
	],
	[
		"labels, which are numbered on their own",
		`outer: for (let i = 0; i < 10; i++) {
			inner: for (let j = 0; j < 10; j++) {
				if (j > i) continue outer;
				if (j === 3) break inner;
				sink(i, j);
			}
		}`
	],
	[
		"a catch parameter redefining a function-scoped name",
		`function run(error) {
			try { sink(error); } catch (error) { sink(error); }
			return error;
		}
		sink(run(1));`
	],
	[
		"a function expression whose argument could shadow its name",
		"sink(function named(argument) { return named && argument; });"
	],
	[
		"a function declared inside a block",
		`function host() {
			{ function blockScoped() { return 1; } sink(blockScoped()); }
			return typeof blockScoped;
		}
		sink(host());`
	],
	[
		"reserved names, which stay as written",
		"function keep(reservedName, other) { return reservedName + other; } sink(keep(1, 2));",
		{ mangle: { reserved: ["reservedName"] } }
	],
	[
		"exported names, which a module may not rename",
		"export const exported = 1; export function run(inner) { return inner + exported; }",
		{ module: true }
	],
	[
		"short exported names, which no scope hands out even where unseen",
		`export const z = 1, y = 2;
		export function crowded(${Array.from({ length: 60 }, (_, i) => `parameter${i}`).join(", ")}) {
			return sink(${Array.from({ length: 60 }, (_, i) => `parameter${i}`).join(", ")});
		}`,
		{ compress: false, module: true }
	],
	[
		"many names in one scope, where one-character names run out",
		`function crowded(input) {
			${Array.from({ length: 80 }, (_, i) => `let variable${i} = input + ${i};`).join("\n")}
			return ${Array.from({ length: 80 }, (_, i) => `variable${i}`).join("+")};
		}
		sink(crowded(1));`,
		// Compress folds the whole body away, and the names are the subject here.
		{ compress: false }
	],
	[
		"options this phase declines, which terser mangles itself",
		"function kept(argument) { return argument; } sink(kept(1));",
		{ mangle: { keep_fnames: true } }
	],
	[
		"class and method names beside mangled locals",
		`class Thing { constructor(value) { this.value = value; } read(offset) { return this.value + offset; } }
		sink(new Thing(1).read(2));`
	]
];

/**
 * @param {string} code a program
 * @returns {string} what it prints, or the error it throws
 */
const runProgram = (code) => {
	/** @type {string[]} */
	const lines = [];
	try {
		vm.runInNewContext(code, {
			console: {
				log: (/** @type {unknown[]} */ ...values) =>
					lines.push(values.map((value) => String(value)).join(" "))
			}
		});
	} catch (err) {
		lines.push(`throws ${/** @type {Error} */ (err).name}`);
	}
	return lines.join("\n");
};

// What the `improve` phase writes shorter: a statement calling a function in
// place runs its body as a block, or in its list when nothing in it is scoped.
const TRY = "try { console.log(1); } catch (e) {}";

/**
 * An array literal of strings, as source, with what `JSON.stringify` leaves
 * that a script could read otherwise escaped.
 * @param {number} length how many strings
 * @param {(index: number) => string=} string the string at each index
 * @returns {string} the literal
 */
const stringArray = (length, string = (index) => `w${index}`) =>
	JSON.stringify(Array.from({ length }, (_, index) => string(index))).replace(
		/[<>/\u2028\u2029]/g,
		(character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
	);

/** @type {[string, string, import("terser").MinifyOptions, string?][]} */
const IMPROVED_CASES = [
	[
		"tabs in a long string, written raw, beside an escaped backslash",
		`console.log("${"row\\t".repeat(30)}", "a\\\\t${"b\\t".repeat(50)}", "c\\td\\te");`,
		{ compress: {}, mangle: false }
	],
	[
		"a function, its body joining the list",
		`!function () { ${TRY} console.log(2); }();`,
		{ compress: {}, mangle: false }
	],
	[
		"an arrow, its body joining the list",
		`(() => { ${TRY} console.log(2); })();`,
		{ compress: {}, mangle: false }
	],
	[
		"a call after `void`",
		`void function () { ${TRY} console.log(2); }();`,
		{ compress: {}, mangle: false }
	],
	[
		"a `let`, kept in a block",
		"!function () { let a = console.log.name; console.log(a, a); }();",
		{ compress: {}, mangle: false }
	],
	[
		"a `var`, moving to the function around the call",
		"function f(x) { console.log(x); (function () { if (x) { var a = console.log.name; console.log(a, a); } })(); } f(1); f(0);",
		{ compress: {}, mangle: false }
	],
	[
		"a `var` moving into a function called in place, which then stays one",
		"function f(x) { (function () { if (x) { var a = console.log.name; console.log(a, a); } (function () { if (x) { var b = console.log.name; console.log(b, b); } })(); })(); } f(1);",
		{ compress: {}, mangle: false }
	],
	[
		"a class, kept in a block",
		"(() => { class A {} console.log(typeof new A(), A.name); })();",
		{ compress: {}, mangle: false }
	],
	[
		"a loop's body, which is no list",
		`for (const x of [1, 2]) (() => { ${TRY} console.log(x); })();`,
		{ compress: {}, mangle: false }
	],
	[
		"a loop's body declaring a `const`, one block",
		"for (const x of [1, 2]) (() => { const a = console.log.name + x; console.log(a, a); })();",
		{ compress: {}, mangle: false }
	],
	[
		"a string first, kept in a block",
		`(() => { ("x"); ${TRY} })();`,
		{ compress: { side_effects: false }, mangle: false }
	],
	[
		"consecutive `if`s leaving the same way",
		'function f(a, b, c) { if (a == null) return true; if (g(a, b)) return true; if (c) return true; for (var i = 0; i < 2; i++) { if (a === i) continue; if (b === i) continue; console.log(i); } try { if (a === 7) throw a; if (b === 7) throw a; } catch (e) { console.log("caught", e); } for (;;) { if (a) break; if (b) break; console.log(3); break; } return false; } function g(a, b) { return a === b; } console.log(f(1, 1), f(null, 2), f(7, 0), f(0, 7), f(0, 0, 0));',
		{ compress: {}, mangle: false }
	],
	[
		"consecutive `if`s leaving by a bare jump or a block ending in one",
		'function f(a, b, list) { var n = 0; for (var i = 0; i < list.length; i++) { var x = list[i]; if (x === a) { n++; continue; } if (x === b) { n++; continue; } for (var j = 0; j < x; j++) console.log(j); console.log(x); } for (;;) { var y = list.pop(); if (!y) break; if (y > 3) break; for (var k = 0; k < y; k++) console.log(k); } return n; } console.log(f(1, 2, [1, 2, 3]), f(9, 0, []), f(0, 9, [0, 5, 2]));',
		{ compress: {}, mangle: false }
	],
	[
		"an arrow reading `this`, which it shares",
		`(() => { ${TRY} console.log(typeof this); })();`,
		{ compress: {}, mangle: false }
	],
	[
		"a function's last `return` of `undefined`, written as the statement or `if` it falls off after",
		"var r = []; function g(a) { return a ? void 0 : a + 1; } function h(a) { return a ? 2 * a : void 0; } function k(a) { return r.push(a), void r.push(a); } var m = () => { r.push(3); return void r.push(4); }; k(2); m(); console.log(r.join(), g(0), g(1), h(0), h(2));",
		{ compress: { passes: 2 }, mangle: false }
	],
	[
		"a conditional whose two sequences end alike, the shared tail written once",
		"var r = []; function f(a, b) { return a ? (r.push(1), r.push(b), r.length) : (r.push(2), r.push(b), r.length); } function g(a) { return [a ? (r.push(3), r.pop(), r.length) : (r.pop(), r.length), a ? (r.pop(), r.length) : (r.push(4), r.pop(), r.length)]; } console.log(f(1, 5), f(0, 6), g(1), g(0), r.join());",
		{ compress: {}, mangle: false }
	],
	[
		"a function's last `return void` of a call, which terser leaves with its defaults off",
		"var r = []; function f(a) { r.push(a); return void r.push(a + 1); } f(1); console.log(r.join(), f(2));",
		{ compress: { defaults: false }, mangle: false }
	],
	[
		"a `return` of `undefined` before the end, as its statements and a bare `return`",
		'var r = []; function f(a, b) { for (var i = 0; i < 3; i++) { if (a === i) { r.push(i); r.push(b); return; } r.push(-i); } } function g(a) { switch (a) { case 1: r.push(1); return; case 2: r.push(2); r.push(3); return; } r.push(4); } function h(a) { try { if (a) { r.push("x"); r.push(a); return; } } finally { r.push("y"); } r.push(a); } f(1, 2); f(5, 6); g(1); g(2); g(3); h(0); h(1); console.log(r.join());',
		{ compress: {}, mangle: false }
	],
	[
		"a `return` of `undefined` as an `else` or a loop's body, braced, which terser leaves with its defaults off",
		"var r = []; function f(a) { if (a) r.push(1); else return void r.push(2); r.push(3); } function g(a) { for (;;) return r.push(a), void 0; } function h(a) { if (a) return \"x\", void r.push(a); else return void r.push(0); } f(0); f(1); g(4); h(0); h(5); console.log(r.join());",
		{ compress: { defaults: false }, mangle: false }
	],
	[
		"a call between expressions, which terser joined in a sequence",
		`console.log(0); (() => { ${TRY} console.log(2); })(); console.log(3);`,
		{ compress: {}, mangle: false }
	],
	[
		"a `new` passing arguments past what its constructor reads",
		'function f() { function Z(a) { this.a = a; } class A { constructor() { this.n = 1; } } class B {} return [new Z(1, 2, 3).a, new A(1, 2).n, new B(1) instanceof B, new Z(4, g(), 5).a]; } function g() { console.log("g"); } console.log(f());',
		{ compress: {}, mangle: false }
	],
	[
		"two calls in a sequence, one keeping a `let` in a block",
		`(() => { let a = console.log.name; console.log(a, a); })(); (() => { ${TRY} console.log(2); })();`,
		{ compress: { passes: 2 }, mangle: true }
	],
	[
		"a conditional whose other branch is its test, or ends as its other branch",
		"function f(a, b, c) { var r = []; return [a ? b : a, a ? (r.push(1), c) : c, a ? (r.push(2), r.push(3), c) : c, r.join()]; } console.log(f(0, 1, 2), f(3, 4, 5));",
		{ compress: {}, mangle: false }
	],
	[
		"a conditional choosing `1` or `0`, as a number conversion of its test",
		"function f(a, b) { var x = a ? 1 : 0, y = a ? 0 : 1; return [x, y, a < b ? 1 : 0, !a ? 1 : 0, b + (a ? 1 : 0), b - (a ? 0 : 1), (a ? 1 : 0).toFixed(1), -(a ? 1 : 0), typeof (a ? 1 : 0)]; } for (var v of [0, 1, \"\", \"x\", NaN, null, {}, 0n, 2n]) console.log(f(v, 1), f(v, \"s\"));",
		{ compress: {}, mangle: false }
	],
	[
		"a nested function reading its own `this`",
		`!function () { ${TRY} console.log([1].map(function () { return typeof this; })[0]); }();`,
		{ compress: {}, mangle: false }
	],
	[
		"a string method called on a literal",
		'console.log("abcde".charAt(1), "abc".normalize(), "abcde".replace("c", "x"));',
		{ compress: {}, mangle: false }
	],
	[
		"`Math` functions called on literals",
		"console.log(Math.max(1, 5, 2), Math.abs(-3), Math.round(-0.4), Math.imul(3, 4));",
		{ compress: {}, mangle: false }
	],
	[
		"a string method given an index past the string",
		'console.log("xy".charCodeAt(1e99), "abcde".charAt(4294967295));',
		{ compress: {}, mangle: false }
	],
	[
		"built-in calls and constructions on literals no one reads",
		'Math.random(); Object.keys([1, , 2]); Date(); String([1, { a: [2] }]); new Set; new Error("m"); new Date(0); new Uint8Array(16); console.log(1);',
		{ compress: {}, mangle: false }
	],
	[
		"built-in globals and their properties no one reads",
		"JSON; Reflect; Math.PI; Number.NaN; Object.prototype.toString; Symbol.iterator; console.log(1);",
		{ compress: {}, mangle: false }
	],
	[
		"a negated test nobody reads the value of, as the opposite operator",
		"function f(a, b) { !a || b.push(1); !a && b.push(2); !a.length || b.push(3), b.push(4); for (;;) { !a || b.push(5); break; } return b.join(); } console.log(f(0, []), f(1, []), f([], []));",
		{ compress: {}, mangle: false }
	],
	[
		"a RegExp no one reads",
		'new RegExp("foobar", "i"); new RegExp("a+"); RegExp("(?<a>x)\\\\k<a>", "gimsuy"); Math?.prototype.toString; console.log(1);',
		{ compress: {}, mangle: false }
	],
	[
		"reads a `typeof` guards",
		'typeof y != "undefined" && y; typeof y !== "undefined" && y; typeof y === "undefined" || y; typeof y == "undefined" || y; typeof y < "u" && y; typeof y <= "u" && y; typeof y >= "u" || y; typeof y > "u" || y; "u" > typeof y && y; "u" < typeof y || y; console.log(1);',
		{ compress: {}, mangle: false }
	],
	[
		"global functions called on literals",
		'console.log(parseInt("ff", 16), encodeURIComponent("a b"), isNaN("x"));',
		{ compress: {}, mangle: false }
	],
	[
		"built-ins called on `Infinity`, which the compressor writes as `1/0`",
		"console.log(Math.abs(-Infinity), isFinite(Infinity), Math.max(0, -Infinity), String.fromCharCode(Infinity));",
		{ compress: {}, mangle: false }
	],
	[
		"`toString` of number literals",
		"console.log(0 .toString(), 100 .toString(16), 1000000 .toString(36), NaN.toString(2), (-Infinity).toString(2), 0.5.toString());",
		{ compress: {}, mangle: false }
	],
	[
		"`concat` and `Array.of` on literals",
		'console.log([1, 2].concat(1).concat(2, ["abc"]), "1".concat(1, ["abc"]), [].concat(1).concat(2).join(","), Array.of("a", ["b", "c"]), Array.of().length, [[1]].concat(2));',
		{ compress: {}, mangle: false }
	],
	[
		"a `Number` constant read after an assignment it ignores",
		"Number.NaN = 1; console.log(Number.NaN);",
		{ compress: {}, mangle: false }
	],
	[
		"`Number` constants written as their numbers",
		"console.log(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN);",
		{ compress: {}, mangle: false }
	],
	[
		"`Number` and `String` functions called on literals",
		"console.log(Number.isInteger(5), Number.isSafeInteger(2 ** 53), String.fromCharCode(65, 66), String.fromCodePoint(67));",
		{ compress: {}, mangle: false }
	],
	[
		"an array literal joined",
		'console.log([1, "a", , null].join("-"));',
		{ compress: {}, mangle: false }
	],
	[
		"an array literal of compressed literals joined",
		"console.log([true, void 0, NaN, -1].join());",
		{ compress: {}, mangle: false }
	],
	[
		"an array literal of literals left as written joined",
		'console.log(["a", true, false, Infinity].join("-"));',
		{ compress: { booleans: false, keep_infinity: true }, mangle: false }
	],
	[
		"`toFixed`, `toPrecision`, `toExponential` and `valueOf` of number literals",
		"console.log((0).toFixed(), 1..toFixed(1), 110..toFixed(4), (1e-101).toPrecision(3), (-0).toPrecision(3), (1 / 0).toPrecision(3), 1.5.toExponential(2), (1e21).toFixed(2), (1).valueOf());",
		{ compress: {}, mangle: false }
	],
	[
		"an array of strings, numbers and booleans joined, as a concatenation",
		'function f(x, y) { return [+x + 1, +y + 2, "z"].join(""); } function g(x) { return [, `${x}`, "a", null, !x].join("-"); } function h(x) { return [`${x}`].join(); } function k(x) { return [[!x].join(), [x * 1, !x].join()]; } console.log(f(1, 2), g("x"), g(""), h(3), k(0), k(2));',
		{ compress: {}, mangle: false }
	],
	[
		"`Math.pow` with one number side, as `**` from ECMAScript 2016",
		"function f(a, b) { return [Math.pow(a, 3), Math.pow(2, b), Math.pow(-a, 2), Math.pow(a + b, 0.5), Math.pow(-2, b)]; } console.log(f(2, 3).join());",
		{ compress: { ecma: 2016 }, ecma: 2016, mangle: false }
	],
	[
		"`Number`'s safe-integer bounds and epsilon, as powers of two from ECMAScript 2016",
		"console.log(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.EPSILON, -Number.EPSILON, 1 / Number.EPSILON, Number.MAX_SAFE_INTEGER.toString(16));",
		{ compress: { ecma: 2016 }, ecma: 2016, mangle: false }
	],
	[
		"an arrow naming `yield` in an async function, which reserves only `await`",
		"var yield; async function f(n) { while (n--) { (() => { yield = 1; })(); } } f(2); console.log(yield);",
		{ compress: { passes: 2 }, mangle: false }
	],
	[
		"an arrow naming `await` in a generator, which reserves only `yield`",
		"var await; function* g(n) { while (n--) { (() => { await = 1; })(); } } g(2).next(); console.log(await);",
		{ compress: { passes: 2 }, mangle: false }
	],
	[
		"`Array` and `Object` called or constructed, as literals",
		'var y = Math.random() < 2 ? 2 : 0; console.log(new Array(1, 2).length, Array().length, new Array(3).length, 1 in new Array(3), new Array("a")[0], new Array(y).length, Object.keys(new Object()).length);',
		{ compress: {}, mangle: false }
	],
	[
		"constructors that construct the same called, without `new`",
		'console.log(new Error("a").message, new TypeError("b") instanceof TypeError, new Function("a", "return a * 2")(3), new RegExp("a", "g").global, new Array(Math.random() < 2 ? 2 : 0, ...[3]).length);',
		{ compress: {}, mangle: false }
	],
	[
		"a spread array literal passed to `new`",
		"function F() { this.n = arguments.length; } console.log(new F(...[1, 2]).n, new F(...[]).n, new F(...[1, 2]).n);",
		{ compress: {}, mangle: false }
	],
	[
		"`typeof` against `\"undefined\"` as an ordering",
		'console.log(typeof nothing === "undefined", typeof console !== "undefined", "undefined" == typeof nothing.length, !(typeof nothing == "undefined"), typeof nothing == "undefined" ? 1 : 2);',
		{ compress: {}, mangle: false }
	],
	[
		"a `typeof` terser leaves before \"undefined\"",
		'var a = typeof nothing != "undefined"; console.log(a);',
		{
			compress: { defaults: false, comparisons: true, typeofs: true },
			mangle: false
		}
	],
	[
		"`typeof` orderings against \"u\" kept in the order written",
		'console.log(typeof nothing == "undefined", !("u" > typeof nothing), "u" < typeof nothing);',
		{ compress: { comparisons: false }, mangle: false }
	],
	[
		"`RegExp` given flags and `Array` given one argument not a short length",
		'var y = Math.random() < 2 ? "a" : ""; console.log(new RegExp(y, "g").global, new Array(typeof y)[0], new Array(!0).length, new Array(7).length, typeof Object(y));',
		{ compress: {}, mangle: false }
	],
	[
		"a `+` beside a number literal in arithmetic",
		'var d = Math.random() < 2 ? "5" : ""; console.log(1000 * +d, 1 - +d, 5 | +d, 2 ** +d);',
		{ compress: {}, mangle: false }
	],
	[
		"names a declared pattern binds that nothing reads",
		'!function () { var o = Math.random() < 2 ? { a: 1, b: 2, c: { d: 3, e: 4 } } : {}; const { a, b = 5, c: { d, e } } = o; const [p, q, r] = [1, 2, 3]; const { s, t } = { s: 1, t: 2 }; console.log(a, d, q, s); }();',
		{ compress: { pure_getters: true }, mangle: false }
	],
	[
		"names a parameter's pattern binds that nothing reads",
		"console.log([[{ a: 1, b: 2 }, [3, 4]]].map(function ([{ a, b }, [c, d]]) { return a + d; })[0]);",
		{ compress: {}, mangle: false }
	],
	[
		"a pattern naming nothing, reading a literal",
		"!function () { const { a } = {}; const [b] = [1]; console.log(2); }();",
		{ compress: {}, mangle: false }
	],
	[
		"a pattern naming nothing, reading a literal whose function spreads",
		"console.log(function (o) { const {} = { f: () => [...o] }; return 2; }([1]));",
		{ compress: { ecma: 2020 }, ecma: 2020, mangle: false }
	],
	[
		"a logical expression assigning what it tests, from ECMAScript 2021",
		"function f(a, b, o) { a || (a = b); o.p || (o.p = 1); o.q ?? (o.q = 2); o.p && (o[\"p\"] = 3); o[0] || (o[0] = 4); return a; } var o = {}; console.log(f(0, 4, o), f(5, 6, o), JSON.stringify(o));",
		{ compress: { ecma: 2021 }, ecma: 2021, mangle: false }
	],
	[
		"a logical expression running a sequence that ends assigning what it tests, from ECMAScript 2021",
		'function f(a, b, o, log) { a || (log.push(1), a = b); o.p || (log.push(o.p), o.p = 2); a && (log.push(a), a = 3); o[0] ?? (log.push(4), o[0] = a); return [a, log.join()]; } var o = {}; console.log(f(0, 4, o, []), f(5, 6, o, []), JSON.stringify(o));',
		{ compress: { ecma: 2021 }, ecma: 2021, mangle: false },
		'function f(a,b,o,log){return a||=(log.push(1),b),o.p||=(log.push(o.p),2),a&&=(log.push(a),3),o[0]??=(log.push(4),a),[a,log.join()]}var o={};console.log(f(0,4,o,[]),f(5,6,o,[]),JSON.stringify(o));'
	],
	[
		"a property assigned its own arithmetic, as a compound assignment",
		'function f(o, x) { o.p = o.p + x; o["q"] = o["q"] * x; return o; } console.log(JSON.stringify(f({ p: 1, q: 2 }, 3)));',
		{ compress: {}, mangle: false }
	],
	[
		"a call of what `Object` is passed, as a call of it",
		"function g() { return this === undefined; } var a = { b() { return this === a; } }; function f() { \"use strict\"; return [Object(g)(), Object(a.b)()]; } console.log(f());",
		{ compress: {}, mangle: false }
	],
	[
		"a string's `concat` as a template, from ECMAScript 2015, converting each value in the same order",
		'var log = []; function o(n) { return { toString() { log.push(n); return n; } }; } function f(p, a, n) { return ["".concat(p, "-item"), "".concat(p, "-").concat(a, "-x"), "a".concat(1, n, "z"), "".concat(n, "${").concat("`"), "".concat(o("x"), "!").concat(o("y"))]; } console.log(f("ant", o("a"), 2), log.join());',
		{ compress: { ecma: 2015 }, ecma: 2015, mangle: false }
	],
	[
		"Babel's loop copying a rest parameter out of `arguments` as a spread, from ECMAScript 2015",
		"function all() { for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) { args[_key] = arguments[_key]; } return args; } function rest(a) { for (var _len = arguments.length, others = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; ++_key) others[_key - 1] = arguments[_key]; return [a, others.length, others]; } var o = { m: function () { var self = this; for (var _len2 = arguments.length, more = new Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) { more[_key2 - 2] = arguments[_key2]; } return [self === o, more]; } }; console.log(all(), all(1, 2), rest(), rest(1), rest(1, 2, 3), o.m(1), o.m(1, 2, 3, 4));",
		{ compress: { ecma: 2015 }, ecma: 2015, mangle: false },
		"function all(){var args=[...arguments];return args}function rest(a){var others=[...arguments].slice(1);return[a,others.length,others]}var o={m:function(){var more=[...arguments].slice(2);return[this===o,more]}};console.log(all(),all(1,2),rest(),rest(1),rest(1,2,3),o.m(1),o.m(1,2,3,4));"
	],
	[
		"an optional link on a parenthesized chain, joined to it, from ECMAScript 2020",
		"function f(a) { return [(a?.b)?.c, (a?.b)?.(1), (a?.b)?.[0]]; } console.log(f(null), f({ b: null }), f({ b: Object.assign((x) => x, { c: 2, 0: 3 }) }));",
		{ compress: { ecma: 2020 }, ecma: 2020, mangle: false }
	],
	[
		"a `typeof` against `\"object\"` beside a test for `null`, as the value's truthiness",
		'function f(x) { return [typeof x === "object" && x !== null, typeof x != "object" || x == null, typeof x == "object" && x != null]; } console.log(f(null), f({}), f(1));',
		{ compress: {}, mangle: false }
	],
	[
		"`Array` of two values and a spread, as an array literal",
		"function f(c) { return [new Array(1, 2, ...c), Array(c, 1, ...c)]; } console.log(JSON.stringify(f([3])));",
		{ compress: {}, mangle: false }
	],
	[
		"`AggregateError` constructed without `new`",
		'console.log(new AggregateError([1], "m").message);',
		{ compress: {}, mangle: false }
	],
	[
		"a computed `__proto__` or `constructor` key, written as a name where it means the same",
		'var o = { ["__proto__"]() { return 1; } }; class C { ["__proto__"] = 2; static ["constructor"]() { return 3; } } console.log(o.__proto__(), new C().__proto__, C.constructor());',
		{ compress: {}, mangle: false }
	],
	[
		"a variable assigned its own logical expression, from ECMAScript 2021",
		"function f(a, b) { a = a || b; return a; } function g(a, b) { console.log(b); a = a ?? b; return a; } var E; (function (E) { E[E.A = 0] = \"A\"; })(E || (E = {})); console.log(f(0, 1), f(2, 3), g(null, 4), g(5, 6), E[0]);",
		{ compress: { ecma: 2021 }, ecma: 2021, mangle: false }
	],
	[
		"a test for null or undefined guarding a chain, from ECMAScript 2020",
		"function f(c) { return null == c ? void 0 : c.a.b(); } function g(c) { return null != c ? c() : void 0; } function h(c) { return void 0 == c ? void 0 : c.a?.[0]; } console.log(f(null), f({ a: { b: () => 1 } }), g(void 0), g(() => 2), h(null), h({ a: [3] }));",
		{ compress: { ecma: 2020 }, ecma: 2020, mangle: false }
	],
	[
		"a test for null or undefined storing what it guards, from ECMAScript 2020",
		"function f(c) { var t; return (t = c.a) === null || t === void 0 ? void 0 : t.b(t); } function g(c) { var t; return (t = c.a) === null || t === void 0 ? void 0 : t(); } console.log(f({ a: null }), f({ a: { b: (t) => typeof t } }), g({}), g({ a: () => 2 }));",
		{ compress: { ecma: 2020 }, ecma: 2020, mangle: false }
	],
	[
		"a test for null or undefined choosing what it tests, from ECMAScript 2020",
		"function f(c, d) { return [null != c ? c : 1, void 0 == c ? 2 : c, d || (null != c ? c : 3)]; } function g(c) { var t; return [null == (t = c.a) ? 4 : t, (t = c.b) !== null && t !== void 0 ? t : 5]; } console.log(f(null, 0), f(0, 1), g({}), g({ a: 6, b: 7 }));",
		{ compress: { ecma: 2020 }, ecma: 2020, mangle: false }
	],
	[
		"a test for null or undefined whose value nothing reads, as nullish coalescing, from ECMAScript 2020",
		"function f(a, b, o) { null == a && b(1); null != o.p || b(2); void 0 == (o.q = a) && b(3); return o.q; } console.log(f(null, console.log, {}), f(0, console.log, { p: 1 }));",
		{ compress: { ecma: 2020 }, ecma: 2020, mangle: false }
	],
	[
		"a test for null or undefined guarding a write of what it tests, as a logical assignment, from ECMAScript 2021",
		"function f(a, o) { null == a && (a = 1); null == o.p && (o.p = 2); return [a, o.p]; } console.log(f(null, {}), f(0, { p: 3 }));",
		{ compress: { ecma: 2021 }, ecma: 2021, mangle: false }
	],
	[
		"a property of `this` assigned its own logical expression or arithmetic, from ECMAScript 2021",
		'var log = []; class B {} class C extends B { constructor(early) { if (early) this.p || (this.p = 0); super(); } get p() { log.push("get"); return this._p; } set p(v) { log.push("set " + v); this._p = v; } m() { this.p || (this.p = 1); this.p && (this.p = 2); this.q == null && (this.q = 3); this[0] = this[0] + 4; this.p = this.p - 5; return [this.p, this.q, this[0]]; } } var o = new C(); try { new C(1); } catch (e) { log.push(e.name); } var f = { n: 0, g() { return () => this.n || (this.n = 6); } }; console.log(o.m(), o.m(), f.g()(), log.join());',
		{ compress: { ecma: 2021 }, ecma: 2021, mangle: false }
	],
	[
		"a strict test for null and one for undefined, the first storing the name",
		"function f(c, d) { var t, u; return [(t = c.a) === null || t === void 0, void 0 !== (u = c.b) && null !== u, d || (t = c.a) === null || t === void 0, t, u]; } console.log(f({}, 0), f({ a: 0, b: null }, 1), f({ a: null, b: 2 }, 0));",
		{ compress: {}, mangle: false }
	],
	[
		"a conditional assigning one target either way",
		"var log = []; function c(x) { log.push(x); return x; } c(1) ? r = 1 : r = 2; function f(x) { var o = { set p(v) { log.push(v); } }; c(x) ? o.p = 3 : o.p = 4; c(x) ? o[0] = 5 : o[0] = 6; } f(0); var g = { m(x) { c(x) ? this.p = 7 : this.p = 8; return this.p; } }; console.log(r, g.m(1), log.join());",
		{ compress: {}, mangle: false }
	],
	[
		"a conditional assigning a property of `this` at the top level or in a class extending none",
		"c(1) ? this.q = 1 : this.q = 2; class C { m(x) { c(x) ? this.p = 3 : this.p = 4; return this.p; } } function c(x) { return x; } console.log(q, new C().m(0));",
		{ compress: {}, mangle: false }
	],
	[
		"a `const` nothing writes, as `let`",
		"function f(o) { const a = o.x + 1, { b } = o; for (const k of [a, b]) console.log(k); { const c = [a]; console.log(c, c); } } f({ x: 1, b: 2 }); f({ x: 3, b: 4 });",
		{ compress: {}, mangle: false }
	],
	[
		"a `let` declaration beside one written from a `const`, joined, its names mangled",
		"function f(o) { const a = o.x; let b = o.y; b++; for (const k of [a, b]) { const c = k + b; let d = [c, c]; d.push(a); console.log(d); } } f({ x: 1, y: 2 });",
		{ compress: {} }
	],
	[
		"a `const` nothing writes, as `let`, the names mangled",
		"function f(object) { const first = object.x + 1, { second } = object; for (const key of [first, second]) console.log(key); { const list = [first]; console.log(list, list); } } f({ x: 1, second: 2 }); f({ x: 3, second: 4 });",
		{ compress: {}, mangle: true },
		"function f(o){let n=o.x+1,{second:c}=o;for(let o of[n,c])console.log(o);{let o=[n];console.log(o,o)}}f({x:1,second:2}),f({x:3,second:4});"
	],
	[
		"`const` and `let` declarations joined, patterns among them, the names mangled",
		"function run(input) { const alpha = input.a + 1; let gamma = input.c; const { beta } = input; gamma += alpha; const [delta, epsilon] = input.d; let { eta } = input; for (const item of [alpha, beta, delta]) { const twice = item * 2; const thrice = item * 3; console.log(twice, thrice, eta); } { const inner = alpha + 1; let other = inner; other++; console.log(inner, other, epsilon); } return gamma; } console.log(run({ a: 1, b: 2, c: 3, d: [4, 5], eta: 6 }));",
		{ compress: {}, mangle: true },
		"function run(o){let n=o.a+1,t=o.c,{beta:c}=o;t+=n;let[e,l]=o.d,{eta:s}=o;for(let o of[n,c,e]){let n=2*o,t=3*o;console.log(n,t,s)}{let o=n+1,t=o;t++,console.log(o,t,l)}return t}console.log(run({a:1,b:2,c:3,d:[4,5],eta:6}));"
	],
	[
		"`const` declarations heading loops and holding holes, defaults and rests, written as `let` where they stand",
		"function run(input) { for (const head = input.x; head; ) { console.log(head); break; } for (const [, second] of input.list) console.log(second); const { c = 1, d: { e } = {}, ...rest } = input; const [first, ...others] = input.arr; let counter = 2; const sum = counter + c; console.log(e, rest, first, others, counter, sum); counter++; { const k = input.k; const l = input.l; console.log(k, l); } return () => { const p = input.p; console.log(p); }; } run({ x: 1, list: [[1, 2]], c: 3, d: { e: 4 }, arr: [5, 6], k: 7, l: 8, p: 9 })();",
		{ compress: {}, mangle: true },
		"function run(o){for(let n=o.x;n;){console.log(n);break}for(let[,n]of o.list)console.log(n);let{c:n=1,d:{e:l}={},...c}=o,[s,...r]=o.arr,t=2,e=t+n;console.log(l,c,s,r,t,e),t++;{let n=o.k,l=o.l;console.log(n,l)}return()=>{let n=o.p;console.log(n)}}run({x:1,list:[[1,2]],c:3,d:{e:4},arr:[5,6],k:7,l:8,p:9})();"
	],
	[
		"a pattern naming nothing, reading `null`, which still throws",
		"try { !function () { const { a } = null; }(); } catch (e) { console.log(e.name); }",
		{ compress: {}, mangle: false }
	],
	[
		"names a pattern binds that nothing reads, beside a nested pattern, a string and inert defaults",
		"console.log(function (o) { const [a, [b, c]] = o; const { length: n, x } = \"ab\"; const { y = -1n, z = !0, w } = { w: 1 }; const [] = [1, ...o]; return b + n + w; }([0, [1, 2]]));",
		{ compress: { ecma: 2020 }, ecma: 2020, mangle: false }
	],
	[
		"an array pattern naming nothing, still looking up its value's iterator",
		'delete Array.prototype[Symbol.iterator]; try { !function () { const [a, b, c] = [1, 2, 3]; }(); console.log("no"); } catch (e) { console.log(e.name); }',
		{ compress: {}, mangle: false }
	],
	[
		"a `catch` binding nothing reads, from ECMAScript 2019",
		"try { null.p; } catch (e) { console.log(1); }",
		{ compress: { ecma: 2019 }, ecma: 2019, mangle: false }
	],
	[
		"a call of a function returning a constant longer than the call, kept wherever its value goes on as it is",
		'!function () { function f() { return "a string long enough that a copy costs more than a call"; } function h() { return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; } function g() { return f(); } var o = { a: f() }, x, y = f(); x = f(); o.d ||= f(); console.log(f(), [f()], "<" + f() + ">", o.a || f(), o.b ? f() : 3, (o.c, f()), x, y, o.d, h(), h(), g(), g(), Array(1, 2), Array(3, 4)); }();',
		{ compress: {}, mangle: false }
	],
	[
		"a call of a function returning a constant, kept where the function stays anyway",
		'!function () { function f() { return "a string long enough that a copy costs more than a call"; } console.log(f(), f()); }();',
		{ compress: { unused: false }, mangle: false }
	],
	[
		"a call of a function returning a constant, kept where code outside reads the function",
		'const f = () => "a string long enough that a copy costs more than a call"; console.log(f(), f());',
		{
			compress: {
				toplevel: /** @type {boolean} */ (/** @type {unknown} */ ("funcs"))
			},
			mangle: false
		}
	],
	[
		"a `const` copying a closure's binding, read as it beside an inner binding of the same name",
		"var h = (function () { const t = [0, 0]; return function (o) { const s = t; s[0]++; { let t = o; t.v = s[0]; } return o; }; })(); console.log(h({}).v, h({}).v);",
		{ compress: { passes: 2 }, mangle: false }
	],
	...[
		[
			"an array of strings split on `.`",
			`var a = ${stringArray(100)}; console.log(a.length, a[0], a[99], Array.isArray(a)); a.push("x"); console.log(a.length);`
		],
		[
			"an array of single characters, every delimiter among them, split on nothing",
			`var a = ${stringArray(100, (index) => ". ,()abcdefghijklmnopqrstu"[index % 26])}; console.log(a.join(""), a.length);`
		],
		[
			"an array of single characters past ASCII split on nothing",
			`var b = ${stringArray(100, (index) => String.fromCharCode(0xe0 + (index % 26)))}; console.log(b[3], b.length);`
		],
		[
			"an array of strings holding `.` split on `,`, and on `)` past `(`",
			`var a = ${stringArray(100, (index) => `w${index}.`)}, b = ${stringArray(100, (index) => `w${index}.,(`)}; console.log(a[5], b[5], a.length + b.length);`
		],
		[
			"an array of strings holding `.`, `,`, `(` and `)` split on a space",
			`var a = ${stringArray(100, (index) => `w${index}.,()`)}; console.log(a[5], a.length);`
		],
		[
			"an array of strings holding quotes, a newline and a backslash",
			`var a = ${stringArray(100, (index) => ["a\"b", "c'd", "e\nf", "g\\h"][index % 4] + index)}; console.log(a[0], a[1], a[2], a[3], a.length);`
		],
		[
			"an array of strings built again on each call, and arrays of them",
			`function f() { return ${stringArray(100)}; } var x = f(); x[0] = "y"; var n = [${stringArray(100)}, ${stringArray(100)}]; console.log(f()[0], x === f(), n[1][99]);`
		],
		[
			"an array of strings split beside long arrays holding a number or a hole, left alone",
			`var a = ${stringArray(100)}, b = ${stringArray(100).slice(0, -1)}, 1], c = ${stringArray(100).slice(0, -1)}, , "z"]; console.log(a.length, typeof b[100], 100 in c, c.length);`
		],
		[
			"a value moved past a read of `console`, a built-in or one of its methods",
			"function f(x) { var a = x === 1 ? 2 : 3; console.log(a + 7); var v = g(); console.log(Math.max(v, 1)); var c; c = 2; console.log(c); } function g() { return 3; } f(1);"
		],
		[
			"an array of empty strings",
			`var a = ${stringArray(100, () => "")}; console.log(a.length, a.every((s) => s === ""));`
		],
		[
			"an array of lone surrogates, joined into pairs and split apart",
			`var a = [${Array.from({ length: 100 }, (_, index) => (index % 2 ? '"\\ude00"' : '"\\ud83d"')).join(", ")}]; console.log(a.length, a[0].length, a[0].charCodeAt(0), a[1].charCodeAt(0));`
		],
		[
			"an empty constructor of a class extending nothing, and a class constructed for nothing that runs nothing",
			'class A { constructor() {} m() { return 1; } } console.log(new A().m(), A.length); new class { x = 1; foo() {} }(); new class {}(console.log("argument"));'
		],
		[
			"an equality negated as the opposite one, a boolean negated twice as itself",
			"function f(a, b, o) { return [!(a == b), !(a !== b), !!(a < b), !!(a in o), !!delete o.x, !!(a && b), !!(a || b)]; } console.log(f(1, 2, {}), f(2, 2, { 2: 1 }));"
		],
		[
			"`Boolean` of a value as `!!`, a comparison of an integer with zero read as the integer",
			"function f(a, b) { return [Boolean(), Boolean(a), Boolean(!a), Boolean((a | +b) !== 0), Boolean(a ? (a | +b) === 0 : (b >>> 1) !== 0), Boolean(a ? b : a), Boolean(a ? (a | +b) !== 0 : b)]; } console.log(f(0, 1), f(3, 0), f(1n, 2));"
		],
		[
			"an integer tested against zero as the integer, numbers compared loosely",
			"function f(a, b) { if ((a | +b) !== 0) console.log(1); if (0 == (a >>> b)) console.log(2); if (+a === 0) console.log(3); if ((a & ~b) === 0) console.log(4); if (~+a !== 0) console.log(5); } f(1, 2); f(0, 0); f(-1, NaN);"
		],
		[
			"a function returning what a function it calls in place returns, written with that function's body",
			"var f = function () { return function () { for (var i = 0; i < 2; i++) console.log(i); }(); }; f(); var g = () => (function () { for (var j = 0; j < 2; j++) console.log(j); return j; })(); console.log(g());"
		],
		[
			"`??` after a value never `null` or `undefined`",
			"function f(a, b) { return [!a ?? b, (a + \"x\") ?? b, typeof a ?? b, (a * 2) ?? b, [a] ?? b]; } console.log(f(1, 2), f(null, 3));"
		],
		[
			"an array literal or a bigint concatenated, `+` of an array literal",
			"function f(a) { return [[] + 0, 0 + [], [1, null, , true, void 0] + \"\", [] + typeof a, `${a}` + [], \"\" + 12n, 0x1fn + \"\", +[], +[\" 7 \"], +[1, 2]]; } console.log(f(1));"
		],
		[
			"a character a string literal is indexed at",
			"function f() { return [\"abc\"[1], \"abc\"[-0], \"abc\"[2]]; } console.log(f());"
		],
		[
			"a `const` only copying a parameter read as the parameter",
			"function f(a) { const b = a; g(b); return b[0]; } function g(x) { x.push(2); } console.log(f([1]));"
		],
		[
			"`Number`, `String` and `BigInt` of a literal, `toString` of a boolean or a string",
			"function f() { return [Number(), Number(true), Number(null), Number(void 0), Number(\" 0x10 \"), String(), String(1e21), String([1, 2]), BigInt(5), true.toString(), \"xy\".toString()]; } console.log(f().map(String));"
		],
		[
			"a `#__PURE__` call of a function written in place, passed nothing, as the value it returns",
			"function g(x) { return [x]; } var o = { m: g }; function f(a) { var x = /* @__PURE__ */ (() => [a, 1])(), y = /* @__PURE__ */ (function () { return new Map(); })(), z = /* @__PURE__ */ (() => g(a))(), w = /* @__PURE__ */ (() => o.m(2))(); /* @__PURE__ */ (() => g(a))(); return [x, y.size, z, w, /* @__PURE__ */ (function () { return; })()]; } console.log(f(1));"
		],
		[
			"a value read once moved into a property of a parameter, a function or `this` it is stored to",
			"function g(n) { console.log(n); return n; } function f(o, p) { function h() {} var a = g(1); o.x = a; var b = g(2); p[0] = b; var c = g(3); o[\"y\"] = c; var d = g(4); h.p = d; return [o.x, o.y, p[0], h.p]; } function C() { var a = g(5); this.v = a; } class D { constructor() { var a = g(6); this.v = a; } } var o = { constructor() { var a = g(7); this.v = a; return this; } }; console.log(f({}, []), new C().v, new D().v, o.constructor().v);"
		],
		[
			"a value read once moved into a property of `this` in a block, an arrow or the top level",
			"function g(n) { console.log(n); return n; } function E(x) { if (x) { var a = g(1); this.v = a; } var k = () => { var b = g(2); this.w = b; }; k(); } var e = new E(1); { let c = g(3); this.z = c; } console.log(e.v, e.w, z);"
		],
		[
			"assignments opening the statement after a `var`, as its values",
			"var k; function f(o) { var a, b; a = o.x; b = o.y; console.log(a, b, a, b); } function g(o) { var a; return a = o.x, console.log(a, a), a; } function h(o) { var a; return a = o.x, k = function () { return a; }; } function m(o) { var a; a = o.x; try { console.log(a); } finally { console.log(a + 1); } } f({ x: 1, y: 2 }); h({ x: 4 }); m({ x: 5 }); console.log(g({ x: 3 }), k());"
		],
		[
			"an assignment read first in an `if`, `switch`, `return` or call, as the `var`'s value",
			"function f(o) { var a; if (a = o.x) return a; return a + 1; } function g(o) { var a; switch (a = o.x) { case 1: console.log(a); break; case 2: console.log(2 * a); } return a; } function h(o) { var a; return [typeof (a = o.x) + a, !(a = o.x) && a === 0]; } function k(o) { var a; (a = o.x)(a); } function m(o) { var a; return (a = o.x)`t${a}`; } function n(o) { var a; return (a = o.x)?.(a); } function p(o) { var a; if (a = o.x) { for (var i = 0; i < a; i++) console.log(i); return a; } } console.log(p({ x: 2 }), f({ x: 1 }), f({ x: 0 }), g({ x: 1 }), g({ x: 2 }), h({ x: 0 })); k({ x: console.log }); console.log(m({ x: String.raw }), n({ x: String }), n({}));"
		],
		[
			"a loop's opening assignments, as a `var` in its head or before it",
			"function f(o) { var i, j; for (i = 0, j = 1; i < o.length; i++, j++) console.log(o[i], j); return i + j; } function g(o) { var i, j; for (i = 0, j = 1, console.log(i); i < o.length; i++, j++) console.log(o[i], j); return i + j; } console.log(f([5, 6]), g([7]));"
		]
	].map(
		([name, input]) =>
			/** @type {[string, string, import("terser").MinifyOptions]} */ ([
				name,
				input,
				{ compress: {}, mangle: false }
			])
	)
];

// What the `improve` phase leaves as terser writes it: each body has something
// of its function's own, or the call passes, keeps or constructs something.
/** @type {[string, string][]} */
const KEPT_CASES = [
	["a conditional whose two sequences end in one chain made optional at different links", "function f(flag, obj, t) { return flag ? (t(), obj?.b.c) : (t(1), obj.b?.c); } console.log(f(1, { b: { c: 1 } }, () => 0), f(0, {}, () => 0));"],
	["a conditional whose branches end in one chain made optional at different links", "function f(flag, obj, t) { return flag ? (t(), obj?.b.c) : obj.b?.c; } console.log(f(1, { b: { c: 1 } }, () => 0), f(0, {}, () => 0));"],
	["a `return` of `undefined` in an async generator, which awaits the value a bare `return` does not", "var r = []; async function* f(a) { for (;;) { if (a()) return void r.push(1); yield r.push(2); } } var o = { async *m(a) { if (a) return void r.push(3); yield 4; } }; f(() => 1).next().then(() => o.m(1).next()).then(() => console.log(r.join()));"],
	["a conditional whose other branch reads a global getter again", 'var n = 0; Object.defineProperty(globalThis, "g", { get: function () { return n++; }, configurable: true }); function f(b) { return g ? b : g; } console.log(f(1), f(2));'],
	["a conditional whose other branch reads a getter twice or a different binding", "var n = 0, o = { get x() { return ++n; } }; function f(b) { var a = 1; { let a = 0; var r = a ? b : o.x ? b : o.x; } return [r, a, n]; } console.log(f(2));"],
	["a bigint and a number concatenated, which throws", "try { console.log(1n + 2); } catch (e) { console.log(e.name); }"],
	["consecutive `if`s leaving with different values or to different labels", 'function f(a, b) { if (a) return 1; if (b) return 2; x: for (;;) { for (;;) { if (a) break x; if (b) break; console.log(3); break x; } console.log(4); break; } for (var i = 0; i < 2; i++) console.log(i); } f(1, 0); f(0, 1); f(0, 0);'],
	["consecutive `if`s leaving by a bare `return`, which terser merges itself", 'function f(a, b) { if (a) return; if (b) return; console.log("fall through"); } f(1, 0); f(0, 1); f(0, 0);'],
	["consecutive `if`s alike whose branch does not always leave", 'function f(a, b) { for (var i = 0; i < 3; i++) { if (a === i) try { g(i); } finally { console.log(i); } if (b === i) try { g(i); } finally { console.log(i); } console.log(i); } } function g(i) { console.log("g", i); } f(0, 1); f(1, 1);'],
	["an array literal joining to a string longer than it", 'console.log([!0, !0, !0] + "");'],
	["a conditional choosing `1` or `0` that a number conversion writes no shorter, or choosing `-0`", "function f(a, b) { return [a < b ? 0 : 1, a + b ? 1 : 0, a in b ? 0 : 1, a ? 1 : -0, a ? 2 : 0, a ? -1 : 0]; } console.log(f(1, {}), f(0, { 0: 1 }));"],
	["`+` and `~` of what a literal does not give", "function f(a) { return [+[a], ~a !== 0 ? 1 : 2]; } console.log(f(1), f(1n));"],
	["a string literal indexed past its end, by no constant or as a target", 'function f(i) { var s = "abc"; "abc"[0] = 1; return ["abc"[5], "abc"[i], "abc"[1.5], "abc"[-1]]; } console.log(f(1));'],
	["a `new` whose constructor reads `arguments` or a rest, extends a class, or is rebound", 'function f(h) { function Z(a) { this.n = arguments.length; } function R(...a) { this.n = a.length; } class B { constructor(a) { this.n = arguments.length; } } class C extends B {} var V = function (a) { this.n = 1; }; if (h) V = function () { this.n = arguments.length; }; return [new Z(1, 2).n, new R(1, 2).n, new C(1, 2).n, new V(1, 2).n]; } console.log(f(0), f(1));'],
	["a `new` of what constructs nothing", 'function f() { var F = () => 1, G = function* (a) {}, H = async function (a) {}, O = { a: 1 }; try { new F(1, 2); } catch (e) { console.log(e.name); } try { new G(1, 2); } catch (e) { console.log(e.name); } try { new H(1, 2); } catch (e) { console.log(e.name); } try { new O(1, 2); } catch (e) { console.log(e.name); } } f();'],
	["a `Boolean` passed a spread or a second argument", "function f(a, b) { return [Boolean(...a), Boolean(a, b())]; } console.log(f([0], () => 1));"],
	["a conversion of no literal, which `+` and `\"\"+` would read otherwise for a BigInt or a symbol", "function f(a) { return [Number(a), String(a), BigInt(a)]; } console.log(f(1n));"],
	["a conversion a variable shadows", "function f(Boolean, Number) { return [Boolean(1), Number(true)]; } console.log(f(String, String));"],
	["a `BigInt` of a fraction, which throws", "try { console.log(BigInt(1.5)); } catch (e) { console.log(e.name); }"],
	["a character of a string literal deleted, or half of a surrogate pair", 'try { console.log(delete "abc"[0], "\\ud83d\\ude00"[0].length); } catch (e) { console.log(e.name); }'],
	["an integer compared with zero where it is no test, or two values a BigInt may be", "function f(a, b) { console.log((a | +b) !== 0, (a | b) !== 0 ? 1 : 2, a - b === 0); } f(1n, 1n); f(1, 2);"],
	["a nested array literal concatenated", 'console.log([1, [2, 3]] + "");'],
	["a property assigned its own arithmetic through a name reassigned", "function f(o, x) { o.p = o.p + x; o[x] = o[x] + 1; o = {}; return o; } console.log(f({ p: 1 }, 2));"],
	["`eval` called through `Object`, which a direct `eval` would not read as", 'var x = 1; function f() { var x = 2; return Object(eval)("x"); } console.log(f(), Object(eval)("x"));'],
	["a call of `Object` passed two values, spread, or shadowed", "function f(Object) { return Object(g)(); } function g() { return 1; } console.log(f((x) => x), Object(g, 1)(), Object(...h)()); var h = [g];"],
	["a link on a parenthesized chain that is not optional", "var a = { b: { c: 1 } }; console.log((a?.b).c);"],
	["`__proto__` as the key of an object literal's value, which sets its prototype", 'var o = { ["__proto__"]: [] }; console.log(Array.isArray(o), o.__proto__ === Object.prototype);'],
	["`constructor` as the key of a method or a static field", 'class C { ["constructor"]() { return 1; } static ["constructor"] = 2; } console.log(new C().constructor === C, C.constructor);'],
	["a `typeof` against `\"object\"` beside another test", 'var o = { p: {} }, y = 1; console.log(typeof o.p == "object" && o.p !== null, typeof o == "object" && y !== null, typeof o == "object" && o !== 1);'],
	["`Array` of one value and a spread", "var c = [3]; console.log(Array(1, ...c).length, Array(...c).length);"],
	["a fraction's `toString` in a radix other than ten", "console.log(0.5.toString(3));"],
	["a conditional assigning through `with`", "var o = { a: 0 }; with (o) Math.random() < 2 ? a = 1 : a = 2; console.log(o.a);"],
	["a conditional assigning an undeclared global in strict code", '"use strict"; globalThis.r = 0; Math.random() < 2 ? r = 1 : r = 2; console.log(r);'],
	["a conditional assigning `this` in a field of a class extending another", "class A {} class B extends A { p = Math.random() < 2 ? this.q = 1 : this.q = 2; } console.log(new B().q);"],
	["a conditional assigning `this` before `super()`", "class A {} class B extends A { constructor(x) { try { x ? this.p = 1 : this.p = 2; } catch (e) { console.log(e.name); } super(); } } new B(1);"],
	["a conditional assigning a property of a reassigned name", "function f(x) { var o = {}; function c() { o = {}; return x; } c() ? o.p = 1 : o.p = 2; return o.p; } console.log(f(1));"],
	["a conditional assigning a key read from a name", 'function f(x, k) { var o = {}; Math.random() < 2 ? o[k] = 1 : o[k] = 2; return o.a; } console.log(f(1, "a"));'],
	["a conditional adding to its target", "var a = 0; Math.random() < 2 ? a += 1 : a += 2; console.log(a);"],
	["a strict test for null and undefined of a global", "console.log(globalThis.g === null || globalThis.g === void 0, typeof g);"],
	["a negated test whose value is read", "function f(a, b) { var x = !a || b; return [x, !a && b, (!a || b, !a && b)]; } console.log(f(0, 1), f(1, 0));"],
	["a `concat` keeping a hole", "console.log([, 1].concat(2).length, 0 in [, 1].concat(2));"],
	["a `Number` shadowed by a variable", "var Number = { NaN: 1 }; console.log(Number.NaN);"],
	["a `#__PURE__` call of a function passed something, called optionally, async, running more than a `return`, or returning what has side effects", "function g(x) { return x; } var o = { p: { q: g } }; console.log(/* @__PURE__ */ ((a) => a)(1), /* @__PURE__ */ (() => 1)?.(), /* @__PURE__ */ (() => { g(); return 1; })(), /* @__PURE__ */ (() => g(g()))(), /* @__PURE__ */ (() => o.p.q(1))(), /* @__PURE__ */ (async () => 1)() instanceof Promise, /* @__PURE__ */ (() => o.p)());"],
	["`Number.EPSILON`, longer as a number", "console.log(Number.EPSILON);"],
	["safe-integer bounds, whose digits gzip worse", "console.log(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER);"],
	["a `RegExp` constructed from a regular expression", "var r = /a/g; console.log(new RegExp(r) === r, RegExp(r) === r);"],
	["a spread `Array` call", "var a = [3]; console.log(Array(...a).length);"],
	["a shadowed `Array`", "function f(Array) { return new Array(1, 2); } console.log(f(function (a, b) { this.s = a + b; }).s, f(function () { this.s = 0; }).s);"],
	["a call of a function returning a short constant or none, called once, marked `@__INLINE__`, or read by a test or an operator", '!function () { function f() { return "a string long enough that a copy costs more than a call"; } function g() { return "ab"; } function k() { return "a string long enough that a copy costs more than a call"; } function n() {} function r() { return; } var id = (x) => x; f(); console.log(/* @__INLINE__ */ f(), f() ? 1 : 2, typeof f(), f().length, f() || 1, !f(), g(), g(), k(), n(), n(), r(), r(), id(), id(void 0)); }();'],
	["a `+` beside no number literal", 'var s = Math.random() < 2 ? "5" : ""; console.log("2" - +s, +s - +s, 1 + +s);'],
	["a `var`", "!function () { var a = Math.random(); console.log(a, a); }();"],
	["a `let` copying a parameter written later, or through `arguments` or `eval`", 'function f(a, c) { let b = a; let d = c; a = 3; arguments[1] = 4; return [b, d]; } function g(a) { let b = a; eval("a = 5"); return b; } console.log(f(1, 2), g(1));'],
	["a `let` copying a binding declared after it", "function f() { let b = c; let c = 1; return b; } try { console.log(f()); } catch (e) { console.log(e.name); }"],
	["a `let` copying a longer name read more than once, where names keep their length", "function f(longBinding) { let x = longBinding; g(); return x + x + x; } function g() {} console.log(f(1));"],
	["a `var` the function around the call names elsewhere, or a call it repeats", 'var a = "g"; function f(x) { (function () { if (x) { var a = console.log.name; console.log(a, a); } })(); console.log(a); for (var i = 0; i < 2; i++) (function () { var b; if (i) b = i; console.log(b); })(); } f(1);'],
	["two functions called in place declaring one `var` a closure keeps, or reading a name the other declares", 'function h(x, r) { (function () { if (x) { var a = x.p; r.push(() => a + a); } })(); (function () { if (x) { var a = x.q; r.push(() => a + a); } })(); } function k(x) { (function () { if (x) { var b = x.q; console.log(a, b, b); } })(); (function () { if (x) { var a = x.p; console.log(a, a); } })(); } var a = "outer", r = []; h({ p: 1, q: 2 }, r); k({ p: 1, q: 2 }); console.log(r.map((f) => f()));'],
	["a function called in place inside `with`, whose `var` the object could answer for", 'function f(o) { with (o) { (function () { if (o) { var a = r.length + 1; r.push(() => a + a); } })(); } return o.r.map((g) => g()); } console.log(f({ a: 2, r: [] }));'],
	["a `return`", `!function () { for (let x of [1, 2]) { ${TRY} if (x) return; } console.log(2); }();`],
	["`this`", `!function () { ${TRY} console.log(this); }();`],
	["`arguments`", `!function () { ${TRY} console.log(arguments.length); }();`],
	["`new.target`", `!function () { ${TRY} console.log(new.target); }();`],
	["an arrow reading `this`", `!function () { ${TRY} [1].map(() => this); }();`],
	["an arrow calling `eval`", `!function () { ${TRY} [1].map(() => eval("this")); }();`],
	["a value with effects kept before a read of `console`, which it may patch", 'var log = console.log; function g() { console.log = function (x) { log("patched", x); }; return 1; } function f() { var v = g(); console.log(v); console.log = log; } f(); f();'],
	["a value kept before a global no built-in names, a member a built-in computes, a shadowed built-in, or a built-in the value writes", 'function f(Math) { var v = g(); h(v); var w = g(); console.log(RegExp.$1, w); var x = g(); console.log(Math.max(x)); } function k() { var o = console; var u = (console = { log: function () { o.log("new"); } }, 1); console.log(u); console = o; } var h = console.log; function g() { return 2; } f({ max: String }); k();'],
	["a parameter given an argument", `!function (a) { ${TRY} console.log(a); }(Math.random());`],
	["a parameter given nothing", `!function (a) { ${TRY} console.log(a, a = Math.random()); }();`],
	["a name", `!function f() { ${TRY} console.log(f); }();`],
	["`async`", `!async function () { ${TRY} console.log(2); }();`],
	["a generator", `!function* () { ${TRY} console.log(2); }().next();`],
	["a function declaration", "!function () { function g() {} console.log(g, g); }();"],
	["a label", `!function () { a: for (;;) { ${TRY} break a; } console.log(2); }();`],
	["a directive", `!function () { "use strict"; ${TRY} console.log(2); }();`],
	["`eval`", `!function () { ${TRY} eval("1"); }();`],
	["`with`", "!function () { with (Math) console.log(PI); console.log(2); }();"],
	["`new`", `new function () { ${TRY} console.log(2); }();`],
	["an optional call", `(() => { ${TRY} console.log(2); })?.();`],
	["its value used", `console.log(function () { ${TRY} console.log(2); }());`],
	["a sequence calling nothing in place", "console.log(1); console.log(2);"],
	["`@__NOINLINE__`", `/*@__NOINLINE__*/(function () { ${TRY} console.log(2); })();`],
	["a `yield` identifier", `function* g() { !function () { ${TRY} console.log(yield); }(); } g().next();`],
	["an `await` identifier", `async function f() { !function () { ${TRY} console.log(await); }(); } f();`],
	["a `Math` the program declares", "var Math = { abs: () => 9 }; console.log(Math.abs(-1));"],
	["a global a direct `eval` could rebind", 'function f() { eval(""); return Math.abs(-1); } console.log(f());'],
	["a global a `with` could rebind", "with ({}) console.log(Math.abs(-1));"],
	["a constructor with a parameter, in a derived class, computed or static, and a class constructed whose field, key, block or constructor runs something", 'class A { constructor(a) {} } class B extends A { constructor() { super(); } } class C { ["constructor"]() { return 1; } static constructor() { return 2; } } console.log(A.length, new B() instanceof A, new C().constructor === C, C.constructor()); new class { p = console.log("p"); }(); new class { [console.log("k")]() {} }(); new class { static { console.log("s"); } }(); new class { constructor() { console.log("c"); } }();'],
	["case not in ASCII", 'console.log("\\u00c4B".toLowerCase());'],
	["a call that throws", 'try { console.log(decodeURI("%")); } catch (e) { console.log(1); }'],
	["a result longer than the call", 'console.log("ab".repeat(100));'],
	["a built-in call that throws", 'try { new Set(1); } catch (e) { console.log(1); } try { Object.keys(null); } catch (e) { console.log(2); }'],
	["a RegExp an older Node rejects", 'try { RegExp("a", "v"); } catch (e) { console.log(1); } try { RegExp("[", "g"); } catch (e) { console.log(2); }'],
	["a RegExp pattern holding a slash", 'try { RegExp("a/b"); console.log(1); } catch (e) { console.log(2); }'],
	["a RegExp with flags not a string", 'try { RegExp("a", 1); } catch (e) { console.log(1); }'],
	["a RegExp pattern not a string", 'try { RegExp(1); console.log(1); } catch (e) { console.log(2); }'],
	["a function returning a call in place of a function reading its own `this`, naming itself, holding a directive or declaring a parameter's name", 'var o = { m: function () { return function () { for (var i = 0; i < 2; i++) console.log(typeof this, i); }(); } }; o.m(); var f = function () { return function g() { for (var i = 0; i < 2; i++) console.log(typeof g, i); }(); }; f(); var h = function () { return function () { "use strict"; for (var i = 0; i < 2; i++) console.log(typeof this, i); }(); }; h(); var k = function (a) { return function () { for (var a in { x: 1, y: 2 }) console.log(a); }(); }; k(1);'],
	["a count too large to run", 'try { new Uint8Array(1e9); console.log(1); } catch (e) { console.log(2); }'],
	["an argument no literal", "function f(a) { String(a); Object.keys({ [a]: 1 }); Object.keys({ get b() { return 1; } }); Object.keys({ __proto__: a }); Object.keys([a]); Object.keys({ b: a }); } f([1]); console.log(1);"],
	["a built-in that runs code", 'eval("console.log(1)");'],
	["a built-in global the program declares", "var Set = function () { console.log(1); }; new Set();"],
	["a built-in call a `with` could rebind", "with ({ JSON: { parse: function () { console.log(1); } } }) JSON.parse(\"1\");"],
	["a global read a `with` could rebind", "with ({ get JSON() { console.log(1); } }) JSON;"],
	["a getter of a built-in prototype", "try { Map.prototype.size; } catch (e) { console.log(1); }"],
	["a property read too deep", "try { Math.PI.toFixed; console.log(1); } catch (e) { console.log(2); }"],
	["an optional built-in call", "Math?.max(1); JSON.parse?.(\"1\"); console.log(1);"],
	["an arrow of one conditional `return`, which prints as its value", "var f = (a) => (a ? void 0 : a + 1); console.log(f(0), f(1));"],
	["a static the generated tables leave out", "try { Math.nope(); } catch (e) { console.log(1); }"],
	["a call of something that is no built-in", "var o = { f: function () { console.log(1); } }; o.f(); (0, o.f)();"],
	["a `RegExp` newer than ES2018, which a newer host engine reads too", 'RegExp("(?i:a)"); console.log(1);'],
	["a `Symbol.for`, which would register its key in the build's own registry", 'Symbol.for("k"); console.log(1);'],
	["a `typeof` guard of another name", 'try { typeof y < "u" && z; } catch (e) { console.log(1); }'],
	["a `typeof` guard the wrong way round", 'try { typeof y > "u" && y; } catch (e) { console.log(1); }'],
	["a `typeof` comparison guarding the wrong way round", 'try { typeof y < "u" || y; } catch (e) { console.log(1); }'],
	["a `typeof` guard of a declared name", 'var y = { valueOf: function () { console.log(1); } }; typeof y != "undefined" && +y;'],
	["a `typeof` guard of no reference", 'typeof 1 != "undefined" && console.log(1); typeof y != 1 && console.log(2); typeof y in {} || console.log(3);'],
	["a count past the call's own size", 'console.log("a".repeat(1e9), "a".padStart("99999"), "a".padEnd(1e9));'],
	["a string longer than the call", 'console.log("abcdefgh".repeat(3));'],
	["a number printed longer than the call", "console.log(Math.fround(0.1));"],
	["an argument no literal", 'console.log("abc".charAt(Math.random() > 2 ? 0 : 1));'],
	["an argument some other operator makes", 'console.log("abc".indexOf(typeof Math.random()));'],
	["a global no built-in", "try { console.log(abs(1)); } catch (e) { console.log(2); }"],
	["a function its object does not have", "try { console.log(Number.abs(-1)); } catch (e) { console.log(2); }"],
	["a method of no literal", "console.log(String(typeof x).charAt(0));"],
	["a string method left out", 'try { console.log("a".join()); } catch (e) { console.log(2); }'],
	["an array of something no literal", "console.log([[Math.random() > 2]].join());"],
	["an array joined holding a value no string, number or boolean", "console.log([{}, Math.random() > 2].join(\"-\"), [Math.random() > 2, 1].join(1));"],
	["an array of no value joined where a global may be rebound", 'function f(o) { with (o) return [[null].join(), [void 0].join("-"), [,].join()]; } console.log(f({}));'],
	["an array joined, longer as a concatenation", 'function f(a, b, c) { return [a * 1, b * 1, c * 1].join("------"); } console.log(f(1, 2, 3));'],
	["a number method throwing for its argument", "try { console.log((1).toFixed(101)); } catch (e) { console.log(e.name); }"],
	["a function left out", 'console.log(Math.sin(1), "a,b".split(","));'],
	["a method the oldest Node lacks", 'console.log("abc".at(-1), "abc".replaceAll("b", "x"));'],
	["an optional call", 'console.log("abc"?.charAt(1));'],
	["an array of 99 strings, too short to split", `var a = ${stringArray(99)}; console.log(a.length);`],
	["an array of strings holding every delimiter", `var a = ${stringArray(100, (index) => `w${index}. ,()`)}; console.log(a.length);`],
	["an array of strings and a number", `var a = ${stringArray(100).slice(0, -1)}, 1]; console.log(a.length, typeof a[100]);`],
	["an array of strings with a hole", `var a = ${stringArray(100).slice(0, -1)}, , "z"]; console.log(a.length, 100 in a);`],
	["an index into an array of strings, folded first", `console.log(${stringArray(100)}[3]);`],
	["a computed key a class can write as it is", 'class C { ["prototype"] = 1; ["prototype"]() {} static ["#prototype"] = 2; static ["constructor"] = 3; static [0]() {} } console.log(new C().prototype, C["#prototype"], C.constructor, typeof C[0]);'],
	["an unused class whose static keys are not known to be `prototype`", 'function f(k) { var p = "prototype"; class K { static x() {} static ["y"] = 1; ["prototype"]() {} [p]() {} static [k]() {} static [0]() {} static [-1]() {} static [["x"]]() {} static [["prototype", "x"]]() {} static [[]]() {} static [[k]]() {} } return 1; } console.log(f("x"), f(1));'],
	["a computed `__proto__` an object can write as an arrow", 'var o = { ["__proto__"]() { return 1; }, a() { return 2; } }; console.log(Object.keys(o).join(), o.__proto__(), o.a());'],
	["a value read once kept from a store that reads first what it may change", 'function g(n) { console.log(n); return n; } function f(o, k) { let l = {}; var a = g(1); o[k] = a; var b = g(2); o.p.q = b; var c = g(3); o.r += c; var d = g(4); l.x = d; var e = g(5); o.s = o.p.t; console.log(e); return function () { var a = g(6); o.u = a; }; } function h(args) { args[0] = {}; return 1; } function m(o) { var a = h(arguments); o.x = a; } class A {} class B extends A { constructor() { var a = (super(), 1); this.v = a; } } var p = { p: {}, r: 1 }; f(p, "s")(); m(p); var q = g(7); p.y = q; console.log(JSON.stringify(p), new B().v);'],
	["a computed key an object can write as it is", 'var o = { ["#constructor"]() { return 1; }, ["prototype"]: 2 }, p = { get ["#" + "constructor"]() { return 3; } }; console.log(o["#constructor"](), o.prototype, p["#constructor"]);'],
	["an assignment to a `var` declared before another's value, which runs first", "function f(o) { var a, b = o.y; a = o.x; console.log(a, b, a, b); } f({ x: 1, y: 2 });"],
	["an assignment to a `var` assigned again by what follows, or before a function that would need parentheses", "function f(o) { var a; a = o.x; console.log(a); a = o.y; console.log(a); } function g() { var x; if (x = true, 0 !== (x ^= true)) throw 1; if (x = new Boolean(true), 0 !== (x ^= true)) throw 2; } function h(o) { var b; b = o.x, function () { console.log(b); }.call(o), console.log(b); } f({ x: 1, y: 2 }); g(); h({ x: 3 });"],
	["an assignment whose property is then written, or that is compound, or calls `eval`", "function f(o) { var a; (a = o.x).p = 1; console.log(a, a); } function g(o) { var a = 1; a += o.x; console.log(a, a); } function h(o) { var eval; (eval = o.x)(\"1\"); return eval; } f({ x: {} }); g({ x: 1 }); console.log(h({ x: String }));"]
];

// Each prints one thing and terser's output another, under the options named.
/** @type {[string, string, import("terser").MinifyOptions][]} */
const CORRECTED_CASES = [
	[
		"a default calling out, in a declaration moved into its one use",
		'function make() { return { pick }; function pick(node, type, initial = type, flow = cast(node)) {} } function cast(node) { console.log("cast", node); } make().pick(1);',
		{ compress: { keep_fargs: false }, mangle: false }
	],
	[
		"new.target with unsafe arrow conversion enabled",
		"console.log((function () { return new.target; })());",
		{ compress: { passes: 2, ecma: 2015, unsafe_arrows: true }, mangle: false }
	],
	[
		"new.target in an inlined function",
		"console.log((function () { return !new.target; })());",
		{ compress: { passes: 2 }, mangle: false }
	],
	[
		"new.target in a called function inside a constructor",
		"class Outer { constructor() { this.value = (function () { return new.target; })(); } } console.log(new Outer().value === undefined);",
		{ compress: { passes: 2 }, mangle: false }
	],
	[
		"new.target captured by a returned arrow",
		"console.log((function () { return () => new.target; })()());",
		{ compress: { passes: 2 }, mangle: false }
	],
	[
		"new.target captured by an object's method",
		"const object = { method() { return () => new.target; } }; console.log(object.method()());",
		{ compress: { passes: 2 }, mangle: false }
	],
	[
		"new.target in a returned class's computed key",
		"console.log((function () { return class { [new.target]() {} }; })().prototype.undefined !== undefined);",
		{ compress: { passes: 2 }, mangle: false }
	],
	[
		"new.target in a class's computed key captured by an arrow",
		"console.log((function () { return () => class { [new.target]() {} }; })()().prototype.undefined !== undefined);",
		{ compress: { passes: 2 }, mangle: false }
	],
	[
		"new.target in a returned class's heritage",
		"console.log(Object.getPrototypeOf((function () { return class extends (new.target || Object) {}; })()) === Object);",
		{ compress: { passes: 2 }, mangle: false }
	],
	[
		"a `{ __proto__ }` shorthand, printed",
		"var __proto__ = null; console.log(Object.getPrototypeOf({ __proto__ }) === Object.prototype);",
		{ compress: false, mangle: false }
	],
	[
		"a `{ __proto__ }` shorthand, its value inlined",
		"const __proto__ = 0; console.log(Object.keys({ __proto__ }));",
		{ compress: { toplevel: true }, mangle: false }
	],
	[
		"a `__proto__: __proto__` setter, printed as a shorthand",
		"var p = { a: 1 }; var __proto__ = p; console.log({ __proto__: __proto__ }.a);",
		{ compress: false, mangle: false, format: { shorthand: true } }
	],
	[
		"a spread object setting its prototype",
		"var p = { x: 1 }; console.log({ ...{ __proto__: p } }.x);",
		{ compress: {}, mangle: false }
	],
	[
		"a method read out of a getter's result, then called",
		"var r = { f() { return this === r; } }; console.log({ get: () => r.f }.get()());",
		{ compress: { toplevel: true }, mangle: false }
	],
	[
		"a method read out of a getter's result, then tagging a template",
		"var r = { f() { return this === r; } }; console.log({ get: () => r.f }.get()`x`);",
		{ compress: { toplevel: true }, mangle: false }
	],
	[
		"a conditional folded into a template's tag",
		"var r = { f() { return this === r; } }; var c = 1; console.log((c ? r.f : r.f)`x`);",
		{ compress: { toplevel: true }, mangle: false }
	],
	[
		"a logical expression folded into a template's tag",
		"var r = { f() { return this === r; } }; console.log((0 || r.f)`x`);",
		{ compress: { toplevel: true }, mangle: false }
	],
	[
		"a sequence detaching a template's tag",
		"var r = { f() { return this === r; } }; console.log((0, r.f)`x`);",
		{ compress: { toplevel: true }, mangle: false }
	],
	[
		"a method reading `this` through a direct `eval`",
		"console.log({ v: 1, f: function () { return eval('this').v; } }.f());",
		{ compress: {}, mangle: false }
	],
	[
		"`arguments[0]` where the parameter is reassigned and nothing passed",
		"function m(v) { v = 2; return arguments[0]; } console.log(m());",
		{ compress: { arguments: true }, mangle: false }
	],
	[
		"an empty arrow whose default has an effect",
		"var r = []; ((v = r.push(1)) => {})(); console.log(r.length);",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function whose pattern throws",
		"var r = []; try { (function ([v]) {})(); } catch (e) { r.push(1); } console.log(r.length);",
		{ compress: {}, mangle: false }
	],
	[
		"a class after an early return, read by a closure",
		"function f(x) { var g = () => C; if (x) return; class C {} return g(); } console.log(typeof f(0));",
		{
			compress: { inline: false, reduce_vars: false, collapse_vars: false },
			mangle: false
		}
	],
	[
		"`===` between two calls returning different types",
		"var i = 0; function f() { return { a: i++ ? '1' : 1 }; } console.log(f().a === f().a);",
		{ compress: {}, mangle: false }
	],
	[
		"a function naming `await`, inlined into an async function",
		"var await; async function f() { function g() { await = 1; } g(); } f(); console.log(await);",
		{ compress: { passes: 2 }, mangle: false }
	],
	[
		"a function naming `yield`, inlined into a generator",
		"var yield; function* g() { function h() { yield = 1; } h(); } g().next(); console.log(yield);",
		{ compress: { passes: 2 }, mangle: false }
	],
	[
		"a function naming `await`, inlined into an async arrow",
		"var await; const f = async () => { function g() { await = 1; } g(); }; f(); console.log(await);",
		{ compress: { passes: 2 }, mangle: false }
	],
	[
		"a function naming `await`, inlined into an arrow inside an async function",
		"var await; async function f() { const a = () => { function g() { await = 1; } g(); }; a(); } f(); console.log(await);",
		{ compress: { passes: 2 }, mangle: false }
	],
	[
		"a function naming `await`, inlined into an async function by reference",
		"var await; const g = function () { await = 1; }; async function f() { g(); } f(); console.log(await);",
		{ compress: { passes: 2, toplevel: true }, mangle: false }
	],
	[
		"an escaping arrow whose parameter is `await`, inlined into an async function",
		"var sink; function g() { sink = (await) => await + 1; } async function f() { g(); } f(); console.log(sink(1));",
		{ compress: { passes: 2, toplevel: true }, mangle: false }
	],
	[
		"an escaping arrow whose parameter is `yield`, inlined into a generator",
		"var sink; function g() { sink = (yield) => yield + 1; } function* h() { g(); } h().next(); console.log(sink(1));",
		{ compress: { passes: 2, toplevel: true }, mangle: false }
	],
	[
		"an escaping arrow whose parameter is `await`, inlined into a class static block",
		"var sink; function g() { sink = (await) => await + 1; } class C { static { g(); } } console.log(sink(1), C.name);",
		{ compress: { passes: 2, toplevel: true }, mangle: false }
	],
	[
		"an arrow naming `await`, its body run inside a class static block",
		"var await; class C { static { (() => { await = 1; })(); } } console.log(await, C.name);",
		{ compress: { passes: 2 }, mangle: false }
	],
	[
		"a function naming `await`, inlined into an async generator",
		"var await; async function* g() { function h() { await = 1; } h(); } g().next(); console.log(await);",
		{ compress: { passes: 2 }, mangle: false }
	],
	[
		"a function naming `yield`, inlined into an async generator",
		"var yield; async function* g() { function h() { yield = 1; } h(); } g().next(); console.log(yield);",
		{ compress: { passes: 2 }, mangle: false }
	],
	...[
		[
			"a class dropped for its effects, a computed key reading its private name",
			"var o = {}; try { (function () { class C { [o.#f] = 1; #f = 2; } })(); } catch (e) { console.log(e.name); }"
		],
		[
			"a class dropped for its effects, a computed key testing its private name with `in`",
			'var o = {}; (function () { class C { [#f in o ? "a" : "b"] = 1; #f = 2; } })(); console.log("ok");'
		],
		[
			"a class dropped for its effects, a computed key reading its private name through `?.`",
			"var o = {}; try { (function () { class C { [o?.#f] = 1; #f = 2; } })(); } catch (e) { console.log(e.name); }"
		],
		[
			"a class dropped for its effects, a static value reading its private name",
			"var o = {}; try { (function () { class C { static x = o.#f; #f = 2; } })(); } catch (e) { console.log(e.name); }"
		],
		[
			"a class dropped for its effects, a computed method key reading its private name",
			"var o = {}; try { (function () { class C { [o.#f]() {} #f = 2; } })(); } catch (e) { console.log(e.name); }"
		],
		[
			"a class expression dropped for its effects, a computed key reading its private name",
			"var o = {}; try { (function () { (class { [o.#f] = 1; #f = 2; }); })(); } catch (e) { console.log(e.name); }"
		],
		[
			"a class dropped for its effects, a computed key reading its private method",
			"var o = {}; try { (function () { class C { [o.#m] = 1; #m() {} } })(); } catch (e) { console.log(e.name); }"
		],
		[
			"a class dropped for its effects, a computed key reading its private getter",
			"var o = {}; try { (function () { class C { [o.#g] = 1; get #g() { return 1; } } })(); } catch (e) { console.log(e.name); }"
		],
		[
			"a class dropped for its effects, a computed key reading its private setter",
			"var o = {}; try { (function () { class C { [o.#s] = 1; set #s(v) {} } })(); } catch (e) { console.log(e.name); }"
		],
		[
			"a class dropped for its effects, a computed key reading its static private method",
			"var o = {}; try { (function () { class C { [o.#m] = 1; static #m() {} } })(); } catch (e) { console.log(e.name); }"
		],
		[
			"a class dropped for its effects, a class in its computed key reading its private name",
			'var o = {}; (function () { class C { [(class { static r(x) { return #f in x; } }).r(o)] = 1; #f = 2; } })(); console.log("ok");'
		],
		[
			"a class dropped for its effects, the extends of a class in its key reading its private name",
			"var o = {}; try { (function () { class C { [((class extends (o.#f, Object) { #f = 1; }), 1)] = 1; #f = 2; } })(); } catch (e) { console.log(e.name); }"
		]
	].map(
		([name, input]) =>
			/** @type {[string, string, import("terser").MinifyOptions]} */ ([
				name,
				input,
				{ compress: {}, mangle: false }
			])
	),
	...[
		[
			"a `yield` right of a private `in`",
			"class C { #x; static *g() { return #x in (yield 1); } } var i = C.g(); i.next(); console.log(i.next(new C()).value);"
		],
		[
			"an assignment right of a private `in`",
			"class C { #x; static f(o) { var a; return #x in (a = o); } } console.log(C.f(new C()));"
		],
		[
			"a conditional right of a private `in`",
			"class C { #x; static f(t, o, p) { return #x in (t ? o : p); } } console.log(C.f({}, new C(), {}));"
		],
		[
			"a sequence right of a private `in`",
			"class C { #x; static f(a, o) { return #x in (a, o); } } console.log(C.f({}, new C()));"
		],
		[
			"an arrow right of a private `in`",
			"class C { #x; static f() { return #x in (() => 1); } } console.log(C.f());"
		],
		[
			"a `yield` tagging a template",
			"function* g() { return (yield 1)`t`; } var i = g(); i.next(); console.log(i.next((s) => s[0]).value);"
		],
		[
			"an `await` tagging a template",
			'var o = function () { console.log("tagged"); }; (async function () { try { (await o)`t`; } catch (e) {} })(); console.log("end");'
		],
		[
			"a private `in` tagging a template",
			"class C { #x; static f(o) { try { return (#x in o)`t`; } catch (e) { return e.name; } } } console.log(C.f(() => ({})));"
		],
		[
			"an optional chain tagging a template",
			"var a = { b: (s) => s[0] }; console.log((a?.b)`t`);"
		],
		[
			"a parenthesized `async` heading a for-of",
			"var async; for ((async) of [7]); console.log(async);"
		],
		[
			"an escaped `async` heading a for-of",
			"var async; for (\\u0061sync of [7]); console.log(async);"
		]
	].map(
		([name, input]) =>
			/** @type {[string, string, import("terser").MinifyOptions]} */ ([
				name,
				input,
				{ compress: false, mangle: false }
			])
	),
	...[
		[
			"a private field a direct `eval` in a method reads",
			'class C { #m = 1; get() { return eval("this.#m"); } } console.log(new C().get());'
		],
		[
			"a static private field a direct `eval` reads",
			'class C { static #m = 2; static get() { return eval("C.#m"); } } console.log(C.get());'
		],
		[
			"a private method a direct `eval` calls",
			'class C { #m() { return 3; } get() { return eval("this.#m()"); } } console.log(new C().get());'
		],
		[
			"a private getter a direct `eval` reads",
			'class C { get #m() { return 4; } get() { return eval("this.#m"); } } console.log(new C().get());'
		],
		[
			"a private setter a direct `eval` assigns",
			'class C { #v = 0; set #m(x) { this.#v = x; } get() { eval("this.#m = 5"); return this.#v; } } console.log(new C().get());'
		],
		[
			"a static private method a direct `eval` calls",
			'class C { static #m() { return 6; } static get() { return eval("C.#m()"); } } console.log(C.get());'
		],
		[
			"a private name a direct `eval` tests with `in`",
			'class C { #m = 1; has(o) { return eval("#m in o"); } } console.log(new C().has(new C()), new C().has({}));'
		],
		[
			"a private field a direct `eval` reads through `?.`",
			'class C { #m = 7; get(o) { return eval("o?.#m"); } } console.log(new C().get(new C()));'
		],
		[
			"a private field a direct `eval` in a field initializer reads",
			'class C { #m = 8; n = eval("this.#m"); } console.log(new C().n);'
		],
		[
			"a private field a direct `eval` in a static block reads",
			'class C { static #m = 9; static { console.log(eval("C.#m")); } }'
		],
		[
			"a private field a direct `eval` in an arrow reads",
			'class C { #m = 10; get() { return (() => eval("this.#m"))(); } } console.log(new C().get());'
		],
		[
			"an outer class's private field a direct `eval` in an inner class reads",
			'class D { #p = 11; get() { const d = this; class C { get() { return eval("d.#p"); } } return new C().get(); } } console.log(new D().get());'
		],
		[
			"a class expression's private field a direct `eval` reads",
			'const C = class { #m = 12; get() { return eval("this.#m"); } }; console.log(new C().get());'
		],
		[
			"a private name a direct `eval` reads, declared by another class too",
			'class C { #m = 13; get() { return eval("this.#m"); } } class D { #m = 14; get() { return this.#m; } } console.log(new C().get(), new D().get());'
		]
	].map(
		([name, input]) =>
			/** @type {[string, string, import("terser").MinifyOptions]} */ ([
				name,
				input,
				{ compress: false, mangle: true }
			])
	),
	[
		"a parameter default's closure reading a name its body declares with `var`",
		"var x = 'out'; var a, b; function f(_ = a = () => x) { var x = 'in'; b = () => x; } f(); console.log(a(), b());",
		{ compress: false, mangle: true }
	],
	[
		"a parameter default reading a name its body redeclares",
		"var x = 1; function f(a = x, b = a) { var x = 2, a; return x + a + b; } console.log(f());",
		{ compress: false, mangle: true }
	],
	[
		"a parameter pattern's computed key reading a name its body declares",
		"var k = 'a'; function f({ [k]: y } = { a: 'out', b: 'in' }) { var k = 'b'; return y; } console.log(f());",
		{ compress: false, mangle: true }
	],
	[
		"a parameter default assigning a name its body declares",
		"var x = 'out'; function f(_ = (x = 'set')) { var x = 'in'; return x; } console.log(f(), x);",
		{ compress: false, mangle: true }
	],
	[
		"a parameter default updating a name its body declares",
		"var n = 1; function f(_ = n++) { var n = 10; return n; } console.log(f(), n);",
		{ compress: false, mangle: true }
	],
	[
		"a parameter default testing the type of a function its body declares",
		"function f(_ = typeof h) { function h() {} return _; } console.log(f());",
		{ compress: {}, mangle: false }
	],
	[
		"a rest parameter's default reading a name its body declares",
		"var x = 'out'; var a; function f(...[_ = a = () => x]) { var x = 'in'; } f(); console.log(a());",
		{ compress: false, mangle: true }
	],
	[
		"a constructor's parameter default reading a name its body declares",
		"var x = 'out'; var a; class C { constructor(_ = a = () => x) { var x = 'in'; } } new C(); console.log(a());",
		{ compress: false, mangle: true }
	],
	[
		"a setter's parameter default reading a name its body declares",
		"var x = 'out'; var a; var o = { set p(_ = a = () => x) { var x = 'in'; } }; o.p = undefined; console.log(a());",
		{ compress: false, mangle: true }
	],
	[
		"a generator's parameter default reading a name its body declares",
		"var x = 'out'; var a; function* f(_ = a = () => x) { var x = 'in'; yield x; } console.log(f().next().value, a());",
		{ compress: false, mangle: true }
	],
	[
		"a parameter default reading a name its body declares with `const`",
		"var x = 'out'; var a; function f(_ = a = () => x) { const x = 'in'; } f(); console.log(a());",
		{ compress: false, mangle: true }
	],
	[
		"a parameter default reading a class its body declares",
		"var C = 'out'; var a; function f(_ = a = () => C) { class C {} } f(); console.log(a());",
		{ compress: false, mangle: true }
	],
	[
		"a parameter default's closure reading a name its body declares, compressed",
		"function g() { var x = 'out'; var a, b; function f(_ = a = () => x) { var x = 'in'; b = () => x; } f(); console.log(a(), b()); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"a parameter default's closure reading a name its body declares as a function",
		"var h = 'out'; var a; function f(_ = a = () => h) { function h() {} } f(); console.log(a());",
		{ compress: false, mangle: true }
	],
	[
		"a parameter default's closure reading a name its body declares with `let`",
		"var x = 'out'; var a; function f(_ = a = () => x) { let x = 'in'; } f(); console.log(a());",
		{ compress: false, mangle: true }
	],
	[
		"a destructured parameter default's closure reading a name its body declares",
		"var x = 'out'; var a; function f({ y = a = () => x } = {}) { var x = 'in'; } f(); console.log(a());",
		{ compress: false, mangle: true }
	],
	[
		"an arrow's parameter default reading a name its body declares",
		"var x = 'out'; var a, b; var f = (_ = a = () => x) => { var x = 'in'; b = () => x; }; f(); console.log(a(), b());",
		{ compress: false, mangle: true }
	],
	[
		"a method's parameter default reading a name its body declares",
		"var x = 'out'; var a; class C { static m(_ = a = () => x) { var x = 'in'; } } C.m(); console.log(a());",
		{ compress: false, mangle: true }
	],
	[
		"a nested function's parameter default reading a name its body declares",
		"var x = 'out'; var a; function f(_ = function () { return function (__ = a = () => x) { var x = 'deep'; }; }) { var x = 'in'; _()(); } f(); console.log(a());",
		{ compress: false, mangle: true }
	],
	[
		"a catch parameter default's closure reading a name its block declares",
		"var a, b; let x = 'out'; try { throw []; } catch ([_ = a = () => x]) { b = () => x; let x = 'in'; } console.log(a(), b());",
		{ compress: false, mangle: true }
	],
	[
		"a catch parameter default's closure reading a name its block declares, compressed",
		"function g() { var a, b; let x = 'out'; try { throw []; } catch ([_ = a = () => x]) { b = () => x; let x = 'in'; } console.log(a(), b()); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function's object pattern default assigning in its own default",
		"function g() { var a; function f({ y = a = 1 } = {}) {} f(); console.log(a); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function's array pattern default assigning in its own default",
		"function g() { var a; function f([y = a = 1] = []) {} f(); console.log(a); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function's nested pattern default assigning",
		"function g() { var a; function f([[y = a = 1]] = [[]]) {} f(); console.log(a); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function's pattern default with a computed key assigning",
		"function g() { var a; function f({ [a = 2]: y } = {}) {} f(); console.log(a); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an empty arrow's pattern default assigning",
		"function g() { var a; var f = ({ y = a = 1 } = {}) => {}; f(); console.log(a); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function called twice, its pattern default counting",
		"function g() { var a = 0; function f({ y = a++ } = {}) {} f(); f(); console.log(a); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function's pattern defaulting to `null`, which throws",
		"function g() { function f({ y } = null) {} try { f(); console.log('ran'); } catch (e) { console.log(e.name); } } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function passed an object its pattern default's inner default reads",
		"function g() { var a; function f({ y = a = 1 } = {}) {} f({}); console.log(a); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function passed `undefined` for its pattern default",
		"function g() { var a; function f({ y = a = 1 } = {}) {} f(void 0); console.log(a); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function's second parameter defaulting to a pattern",
		"function g() { var a; function f(x, { y = a = 1 } = {}) {} f(0); console.log(a); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function expression called in place, its pattern default assigning",
		"function g() { var a; (function ({ y = a = 1 } = {}) {})(); console.log(a); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function's pattern defaulting to an object with a getter",
		"function g() { var a = 0; function f({ y } = { get y() { a++; } }) {} f(); console.log(a); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function's array pattern defaulting to a number, which throws",
		"function g() { function f([y] = 1) {} try { f(); console.log('ran'); } catch (e) { console.log(e.name); } } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function's rest pattern assigning in its default",
		"function g() { var a; function f(...[y = a = 1]) {} f(); console.log(a); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function passed a spread of a generator",
		"function g() { var n = 0; function* it() { n++; } function f() {} f(...it()); console.log(n); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function's pattern defaulting to an object whose prototype has a getter",
		"function g() { var a = 0; function f({ y } = { __proto__: { get y() { a++; } } }) {} f(); console.log(a); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function's array pattern defaulting to a spread of an iterator",
		"function g() { var n = 0; function* gen() { n++; yield 1; } var it = gen(); function f([y] = [...it]) {} f(); console.log(n); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function's pattern defaulting to a spread object with a getter",
		"function g() { var a = 0; var o = { get y() { a++; } }; function f({ y } = { ...o }) {} f(); console.log(a); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function passed an object whose getter its pattern reads",
		"function g() { var a = 0; function f({ y } = {}) {} f({ get y() { a++; } }); console.log(a); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function passed a spread reaching its pattern default",
		"function g() { var a = 0; var args = [0, { get y() { a++; } }]; function f(x, { y } = {}) {} f(...args); console.log(a); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"a function returning a value, passed a spread reaching its pattern default",
		"function g() { var a = 0; var args = [0, { get y() { a++; } }]; function f(x, { y } = {}) { return 1; } console.log(f(...args), a); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an arrow returning a value, passed a spread reaching its pattern default",
		"function g() { var a = 0; var args = [0, { get y() { a++; } }]; var f = (x, { y } = {}) => 1; console.log(f(...args), a); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an `instanceof` nobody reads, its right side no constructor",
		"for (let f of [() => 1 instanceof 1, () => true instanceof true, () => { var G = function () {}; G.prototype = undefined; ({}) instanceof G; }]) { try { f(); console.log('no'); } catch (e) { console.log(e.name); } }",
		{ compress: {}, mangle: false }
	],
	[
		"an `instanceof` nobody reads, reaching `Symbol.hasInstance`",
		"var n = 0, F = {}, G = {}, H = {}; F[Symbol.hasInstance] = function () { n++; }; Object.defineProperty(G, Symbol.hasInstance, { get() { n++; } }); H[Symbol.hasInstance] = {}; 0 instanceof F; try { 0 instanceof G; } catch (e) {} try { 0 instanceof H; } catch (e) { console.log(e.name); } console.log(n);",
		{ compress: {}, mangle: false }
	],
	[
		"an `instanceof` nobody reads under `!`, `void`, `typeof` and `&&`",
		"var n = 0, F = {}; F[Symbol.hasInstance] = function () { n++; return true; }; var t = 1; !(0 instanceof F); void (0 instanceof F); typeof (0 instanceof F); t && 0 instanceof F; console.log(n);",
		{ compress: {}, mangle: false }
	],
	[
		"an `instanceof` as an empty `if`'s test, a conditional's with one value and a sequence's first",
		"var n = 0, F = {}; F[Symbol.hasInstance] = function () { n++; return true; }; if (0 instanceof F) {} var r = 0 instanceof F ? 1 : 1; console.log((0 instanceof F, r), n);",
		{ compress: {}, mangle: false }
	],
	[
		"an `instanceof` nobody reads in an arrow's body",
		"var n = 0, F = {}; F[Symbol.hasInstance] = function () { n++; return true; }; var g = () => { 0 instanceof F; }; g(); console.log(n);",
		{ compress: {}, mangle: false }
	],
	[
		"an `in` nobody reads, its right side no object",
		"try { 'a' in 1; console.log('no'); } catch (e) { console.log(e.name); }",
		{ compress: {}, mangle: false }
	],
	[
		"an `in` nobody reads, reaching a proxy's `has`",
		"var n = 0, p = new Proxy({}, { has() { n++; return true; } }); 'a' in p; console.log(n);",
		{ compress: {}, mangle: false }
	],
	[
		"a class's static method computed as `prototype`",
		"try { class C { static ['prototype']() {} } console.log(typeof C); } catch (e) { console.log(e.name); }",
		{ compress: {}, mangle: false }
	],
	[
		"an unused class with a static field computed as `prototype`, or extending a local async function",
		"for (var f of [function () { class C { static ['prototype'] = 1; } }, function () { async function g() {} class A extends g {} }]) { try { f(); console.log('no'); } catch (e) { console.log(e.name); } }",
		{ compress: {}, mangle: false }
	],
	[
		"an unused name's update dropped from an array read by index",
		"function f() { return 'f'; } function g() { return 'g'; } function t() { var b; return [--b, f(), g()][1]; } console.log(t());",
		{ compress: {}, mangle: false }
	],
	[
		"an unused class extending an arrow or an async arrow",
		"for (var f of [function () { var C = class extends (() => {}) {}; }, function () { var C = class extends (async () => {}) {}; }]) { try { f(); console.log('no'); } catch (e) { console.log(e.name); } }",
		{ compress: {}, mangle: false }
	],
	[
		"an unused class declaration extending a number",
		"try { (function () { class C extends 1 {} })(); console.log('no'); } catch (e) { console.log(e.name); }",
		{ compress: {}, mangle: false }
	],
	[
		"a `for` head's `let` beside an unused name with effects, closures reading each iteration's binding",
		"function init() { return 3; } (function () { var fns = []; for (let i = 0, n = init(); i < 3; i++) fns.push(() => i); console.log(fns.map((f) => f()).join()); })();",
		{ compress: {}, mangle: false }
	],
	[
		"two `for` heads declaring one `let` name, each beside an unused name with effects",
		"function f() { return 1; } function g(a) { for (let i = 0, n = f(); i < 1; i++) console.log(i); for (let i = 5, n = f(); i < 6; i++) console.log(i); return a; } console.log(g(2));",
		{ compress: {}, mangle: false }
	],
	[
		"a BigInt beside a Number, `null`, `undefined`, a boolean or a numeric string, nobody reads",
		"function t(f) { try { f(); console.log('no'); } catch (e) { console.log(e.name); } } t(function () { 1n + 1; }); t(function () { 1n + null; }); t(function () { 1n + void 0; }); t(function () { !0 + 1n; }); t(function () { 1n - 'a'; }); t(function () { 1 << 1n; });",
		{ compress: {}, mangle: false }
	],
	[
		"a BigInt raised to a negative power or shifted unsigned, nobody reads",
		"function t(f) { try { f(); console.log('no'); } catch (e) { console.log(e.name); } } t(function () { 2n ** -1n; }); t(function () { 5n >>> 1n; });",
		{ compress: {}, mangle: false }
	],
	[
		"a wrapped BigInt beside a Number, nobody reads",
		"function t(f) { try { f(); console.log('no'); } catch (e) { console.log(e.name); } } t(function () { Object(1n) + 1; }); t(function () { Object(2n) >>> 0n; });",
		{ compress: {}, mangle: false }
	],
	[
		"an arithmetic operation, a `+` and a negation converting an object nobody reads",
		"function t(f) { try { f(); console.log('no'); } catch (e) { console.log(e.name); } } var o = { valueOf() { throw { name: 'thrown' }; }, toString() { throw { name: 'thrown' }; } }; t(function () { o + 1; }); t(function () { o * 2; }); t(function () { -o; });",
		{ compress: {}, mangle: false }
	],
	[
		"a template converting an object nobody reads",
		"function t(f) { try { f(); console.log('no'); } catch (e) { console.log(e.name); } } var o = { valueOf() { throw { name: 'thrown' }; }, toString() { throw { name: 'thrown' }; } }; t(function () { `${o}`; });",
		{ compress: {}, mangle: false }
	],
	[
		"an assignment nobody reads to a key converting an object",
		"function t(f) { try { f(); console.log('no'); } catch (e) { console.log(e.name); } } var o = { valueOf() { throw { name: 'thrown' }; }, toString() { throw { name: 'thrown' }; } }; t(function () { var b = {}; b[o] ^= 1; });",
		{ compress: {}, mangle: false }
	],
	[
		"an assignment to a property of a primitive, which a setter on its prototype reads",
		"var n = 0; Object.defineProperty(Number.prototype, 'x', { set() { n++; } }); (function () { 0..x = 1; })(); console.log(n);",
		{ compress: {}, mangle: false }
	],
	[
		"an object spreading a proxy nobody reads",
		"var n = 0, p = new Proxy({}, { ownKeys() { n++; return []; } }); (function () { var o = { ...p }; })(); console.log(n);",
		{ compress: {}, mangle: false }
	],
	[
		"a closure reading a `let` before its declaration",
		"function g() { function f() { return x + 1; } console.log(f()); let x; return x; } try { console.log(g()); } catch (e) { console.log(e.name); }",
		{ compress: {}, mangle: false }
	],
	[
		"a destructuring default reading a `let` declared after it",
		"try { (function () { var y; [y = z] = []; let z; })(); console.log('no'); } catch (e) { console.log(e.name); }",
		{ compress: {}, mangle: false }
	],
	[
		"a getter defined on an object handed to `Object.defineProperty`",
		"(function () { var o = {}; Object.defineProperty(o, 'g', { get() { console.log('get'); return 1; } }); var t = o.g; })();",
		{ compress: {}, mangle: false }
	],
	[
		"a class expression's own name assigned in its body",
		"function t(f) { try { f(); console.log('no'); } catch (e) { console.log(e.name); } } t(function () { new (class C { constructor() { C = 42; } })(); });",
		{ compress: {}, mangle: false }
	],
	[
		"`this` read in an arrow before `super()`",
		"class C extends null { constructor() { try { (() => { this; })(); console.log('no'); } catch (e) { console.log(e.name); } return {}; } } new C();",
		{ compress: {}, mangle: false }
	],
	[
		"an unused class extending its own name",
		"function t(f) { try { f(); console.log('no'); } catch (e) { console.log(e.name); } } t(function () { class x extends x {} }); t(function () { (class y extends y {}); });",
		{ compress: {}, mangle: false }
	],
	[
		"a name read in a `with` through a proxy's `has`",
		"var log = []; var env = new Proxy({}, { has(t, k) { log.push('has:' + String(k)); return false; } }); with (env) { Object; } console.log(log.join());",
		{ compress: {}, mangle: false }
	],
	[
		"a block's async and generator functions read after the block",
		"function t(f) { try { f(); console.log('no'); } catch (e) { console.log(e.name); } } t(function () { switch (0) { default: async function x() {} } x; }); t(function () { { function* g() {} } g; });",
		{ compress: {}, mangle: false }
	],
	[
		"a read of a `let` before its declaration in the same block",
		"function t(f) { try { f(); console.log('no'); } catch (e) { console.log(e.name); } } t(function () { { x; let x; } }); t(function () { typeof y; let y = 1; });",
		{ compress: {}, mangle: false }
	],
	[
		"a closure in a `for-of` head reading the loop's own binding",
		"var probe; for (let x of (probe = function () { typeof x; }, [])); try { probe(); console.log('no'); } catch (e) { console.log(e.name); }",
		{ compress: {}, mangle: false }
	],
	[
		"a closure called before the `let` it reads is declared",
		"function g() { function f() { return x + 1; } try { f(); console.log('no'); } catch (e) { console.log(e.name); } let x = null; } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an unused class whose static key a variable names `prototype`",
		"function t(f) { try { f(); console.log('no'); } catch (e) { console.log(e.name); } } var x = 'prototype'; t(function () { (0, class { static [x] = 42; }); }); t(function () { (0, class { static [x]; }); });",
		{ compress: {}, mangle: false }
	],
	[
		"a block's async function a folded `switch` drops, read after it",
		"try { switch (0) { default: async function x() {} } x; console.log('no'); } catch (e) { console.log(e.name); }",
		{ compress: {}, mangle: false }
	],
	[
		"a concatenation tested for its truth, converting an object",
		"function t(f) { try { f(); console.log('no'); } catch (e) { console.log(e.name); } } var o = { valueOf() { throw { name: 'thrown' }; }, toString() { throw { name: 'thrown' }; } }; t(function () { if (o + 'q') console.log('yes'); });",
		{ compress: {}, mangle: false }
	],
	[
		"a strict `arguments.callee` nobody reads",
		"'use strict'; try { (function () { arguments.callee; })(); console.log('no'); } catch (e) { console.log(e.name); }",
		{ compress: {}, mangle: false }
	],
	[
		"an empty strict function's `caller`, read",
		"function foo() { 'use strict'; } try { foo.caller; console.log('no'); } catch (e) { console.log(e.name); }",
		{ compress: {}, mangle: false }
	],
	[
		"a function's `caller` assigned in strict code",
		"'use strict'; try { (function () { var foo = function () {}; foo.caller = 20; })(); console.log('no'); } catch (e) { console.log(e.name); }",
		{ compress: {}, mangle: false }
	],
	[
		"an arrow's `arguments` nobody reads",
		"try { (function () { var t = (() => 1).arguments; })(); console.log('no'); } catch (e) { console.log(e.name); }",
		{ compress: {}, mangle: false }
	],
	[
		"an array spreading a generator nobody reads",
		"function* g() { console.log('ran'); yield 1; } function t() { var it = g(); [...it]; } t();",
		{ compress: {}, mangle: false }
	],
	[
		"an unused array holding a hole, a generator's spread and a call",
		"function* g() { console.log('ran'); yield 1; } function f() { console.log('f'); } function t() { var it = g(); var a = [, ...it, f()]; } t();",
		{ compress: {}, mangle: false }
	],
	[
		"a pure call's argument spreading a generator",
		"function* g() { console.log('ran'); yield 1; } function f() {} function t() { var it = g(); /*#__PURE__*/ f(...it); } t();",
		{ compress: {}, mangle: false }
	],
	[
		"a pure native method's argument spreading a generator",
		"function* g() { console.log('ran'); yield 1; } function o() { console.log('o'); return 'a'; } function t() { var it = g(); (o() + '').indexOf(...it); } t();",
		{ compress: { unsafe: true }, mangle: false }
	],
	[
		"a switch's one case reading a `let` declared in its body",
		'var f; switch (null) { case (f = function () { return x; }, null): let x = "inside"; } console.log(f());',
		{ compress: {}, mangle: false }
	],
	[
		"a switch's case and default, the case reading a `let` declared in its body",
		"var f, g; switch (Math.random() < 2) { case (f = () => x, true): g = 1; let x = 2; break; default: g = 0; } console.log(f(), g);",
		{ compress: {}, mangle: false }
	],
	[
		"a switch's matching case reading a class declared in its body",
		"var f; switch (0) { case (f = () => typeof C, 0): class C {} } console.log(f());",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function's parameter default an `instanceof` reaching `Symbol.hasInstance`",
		"function g() { var n = 0, F = {}; F[Symbol.hasInstance] = function () { n++; return true; }; (function (a = 0 instanceof F) {})(); console.log(n); } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an `instanceof` nobody reads, a proxy in its left side's prototypes",
		"var n = 0, P = new Proxy({}, { getPrototypeOf() { n++; return null; } }), Q = new Proxy(function () {}, { getPrototypeOf() { n++; return null; } }); ({ __proto__: P }) instanceof Object; (class extends Q {}) instanceof Object; P instanceof Object; console.log(n);",
		{ compress: {}, mangle: false }
	],
	[
		"an `instanceof` nobody reads, its built-in name shadowed by a parameter",
		"function f(Object) { [] instanceof Object; } f({ [Symbol.hasInstance]() { console.log('a'); } }); f({ [Symbol.hasInstance]() { console.log('b'); } });",
		{ compress: {}, mangle: false }
	],
	[
		"an `instanceof` nobody reads, its built-in name rebound by a direct `eval`",
		"function g() { eval('var Array = { [Symbol.hasInstance]() { console.log(\"eval\"); } }'); [] instanceof Array; } g();",
		{ compress: {}, mangle: false }
	],
	[
		"an `instanceof` nobody reads, its built-in name rebound by `with`",
		"with ({ Map: { [Symbol.hasInstance]() { console.log('with'); } } }) { [] instanceof Map; }",
		{ compress: {}, mangle: false }
	],
	[
		"an `instanceof` nobody reads, of a built-in name the program assigns",
		"Object = { [Symbol.hasInstance]() { console.log('hit'); } }; [] instanceof Object; console.log(1);",
		{ compress: {}, mangle: false }
	],
	[
		"an `instanceof` nobody reads, of a built-in name assigned, without `reduce_vars` to count it",
		"Object = { [Symbol.hasInstance]() { console.log('hit'); } }; [] instanceof Object; console.log(1);",
		{ compress: { reduce_vars: false }, mangle: false }
	],
	[
		"an `instanceof` nobody reads, of a built-in name a function assigns",
		"function f() { Object = { [Symbol.hasInstance]() { console.log('hit'); } }; } f(); [] instanceof Object; console.log(1);",
		{ compress: {}, mangle: false }
	],
	[
		"a class field keyed `#constructor`, instance, static and bare",
		'class C { ["#constructor"] = 1; static ["#constructor"] = 2; } class D { ["#" + "constructor"]; } console.log(new C()["#constructor"], C["#constructor"], "#constructor" in new D());',
		{ compress: {}, mangle: false }
	],
	[
		"a class method keyed `#constructor`, of each kind",
		'class C { ["#constructor"]() { return 1; } get ["#constructor"]() { return 2; } } class D { set ["#constructor"](v) {} *["#constructor"]() {} async ["#constructor"]() {} async *["#constructor"]() {} } class E { static ["#constructor"]() { return 3; } static get ["#constructor"]() { return 4; } static set [`#constructor`](v) {} static *["#constructor"]() {} static async ["#constructor"]() {} static async *["#constructor"]() {} } console.log(new C()["#constructor"], typeof D.prototype["#constructor"], typeof E["#constructor"]);',
		{ compress: { passes: 2 }, mangle: true }
	],
	[
		"an unused class with a static member keyed `prototype`, of each kind",
		'for (var f of [function () { class C { static ["prototype"]() {} } }, function () { (class { static ["prototype"] = 1; }); }, function () { var C = class { static get ["prototype"]() {} }; }, function () { return 1, class { static set ["prototype"](v) {} }, 2; }, function () { class C { static *[`prototype`]() {} } }, function () { class C { static async ["proto" + "type"]() {} } }, function () { class C { static async *["prototype"]() {} } }, function () { class C { static ["prototype"]; } }]) { try { f(); console.log("made"); } catch (e) { console.log(e.name); } }',
		{ compress: {}, mangle: false }
	],
	[
		"an unused class keyed `prototype` in each position",
		'for (var f of [function () { class C extends (console.log("extends"), Object) { static ["prototype"]() {} } }, function () { class C { static { console.log("block"); } static ["prototype"] = 1; } }, function () { class C { static ["prototype"] = C; } }, function () { return typeof class { static ["prototype"]() {} }; }, function (a) { a ? class { static ["prototype"]() {} } : 0; }, function (a) { a || class { static ["prototype"]() {} }; }, function () { const C = class { static ["prototype"]() {} }; }, function () { let C = class { static ["prototype"]() {} }; }, function () { var o = { m: class { static ["prototype"]() {} } }; }, () => void class { static ["prototype"]() {} }]) { try { f(); console.log("made"); } catch (e) { console.log(e.name); } }',
		{ compress: { passes: 2 }, mangle: true }
	],
	[
		"an unused class whose static key reads a variable holding `prototype`",
		'function f(y) { var x = "prototype"; try { class C { static [x] = y; } console.log("made"); } catch (e) { console.log(e.name); } } f(1); f(2);',
		{ compress: {}, mangle: false }
	],
	[
		"a class keyed `prototype` in an array whose length is folded",
		'try { console.log([class { static ["prototype"]() {} }].length); } catch (e) { console.log(e.name); }',
		{ compress: {}, mangle: false }
	],
	[
		"a class keyed `prototype` moved past an assignment the catch reads",
		'function f() { var y = 1; try { var C = class { static ["prototype"]() {} }; y = 2; return C; } catch (e) { return y; } } console.log(f());',
		{ compress: {}, mangle: false }
	],
	[
		"an unused class keyed `prototype` beside an assignment the catch reads",
		'var y = 1; try { y = 2, class { static ["prototype"]() {} }; } catch (e) { console.log(e.name, y); }',
		{ compress: {}, mangle: false }
	],
	[
		"an unused class whose static key converts to `prototype`",
		'for (var f of [function () { class C { static [["prototype"]]() {} } }, function () { class C { static [[["proto" + "type"]]] = 1; } }, function () { class C { static [{ toString() { return "prototype"; } }]() {} } }, function () { var k = ["prototype"]; class C { static [k]() {} } }, function () { const k = { toString: () => "prototype" }; class C { static [k] = 1; } }]) { try { f(); console.log("made"); } catch (e) { console.log(e.name); } }',
		{ compress: {}, mangle: false }
	],
	[
		"an unused class whose static key converts to `prototype`, its array evaluated",
		'for (var f of [function () { class C { static [["prototype"]]() {} } }, function () { class C { static [[["proto" + "type"]]] = 1; } }, function () { class C { static [["x"]]() {} } }, function () { class C { static [{ a: 1 }]() {} static [null]() {} } }]) { try { f(); console.log("made"); } catch (e) { console.log(e.name); } }',
		{ compress: { unsafe: true }, mangle: false }
	],
	[
		"an object method named `__proto__`, which an arrow would set as the prototype",
		'var r = (o) => [Object.getPrototypeOf(o) === Object.prototype, Object.keys(o).join()]; console.log(r({ __proto__() { return 1; } }), r({ "__proto__"() { return 2; } }), r({ async __proto__() { return 3; } }));',
		{ compress: {}, mangle: false }
	],
	[
		"an object's `__proto__` set to a function, which a method would define as a property",
		'var r = (o) => [Object.getPrototypeOf(o) === Object.prototype, Object.keys(o).join()]; console.log(r({ __proto__: function () {} }), r({ "__proto__": async function () {} }), r({ __proto__: () => {} }));',
		{ compress: { unsafe_methods: true }, ecma: 2020, mangle: false }
	],
	[
		"a static class member keyed `prototype`, of each kind",
		'for (var make of [() => class { static ["prototype"] = 1; }, () => class { static [`prototype`]() {} }, () => class { static get ["proto" + "type"]() {} }, () => class { static set ["prototype"](v) {} }, () => class { static *["prototype"]() {} }, () => class { static async ["prototype"]() {} }, () => class { static async *["prototype"]() {} }, () => class { static ["prototype"]; }]) { try { make(); console.log("made"); } catch (e) { console.log(e.name); } }',
		{ compress: {}, mangle: false }
	]
];

// Calls whose parameters run nothing on a call passing nothing, which the
// `correct` phase leaves to terser to drop or inline.
/** @type {[string, string][]} */
const NO_EFFECT_PARAMETER_CASES = [
	["a default without effects", "function g() { function f(y = 1) {} f(); console.log('x'); } g();"],
	["a pattern defaulting to an empty object", "function g() { function f({ y } = {}) {} f(); console.log('x'); } g();"],
	["a pattern defaulting to an empty array", "function g() { function f([y] = []) {} f(); console.log('x'); } g();"],
	["a function inlined, its pattern default assigning", "function g() { var a; function f({ y = a = 1 } = {}) { return y; } console.log(f(), a); } g();"],
	["a generator's pattern default", "function g() { var a; function* f({ y = a = 1 } = {}) {} f(); console.log(a); } g();"],
	["an async function's pattern default", "function g() { var a; async function f({ y = a = 1 } = {}) {} f(); console.log(a); } g();"],
	["a pattern defaulting to an object of plain properties", "function g() { function f({ y } = { y: 1 }) {} f(); console.log('x'); } g();"],
	["a pattern defaulting to an array without a spread", "function g() { function f([y] = [1, 2]) {} f(); console.log('x'); } g();"],
	["a pattern defaulting to a computed `__proto__` key, an own property", "function g() { function f({ y } = { ['__proto__']: 1 }) {} f(); console.log('x'); } g();"],
	["a pattern default holding a function with a pattern of its own", "function g() { var a; function f({ y = () => { var { z = a = 1 } = {}; } } = {}) {} f(); console.log(a); } g();"],
	["a plain rest parameter", "function g() { function f(...y) {} f(); console.log('x'); } g();"],
	["a spread array literal", "function g() { function f() {} f(...[1, 2]); console.log('x'); } g();"]
];

// terser's parser refuses `let` as a name, so with corrections off the print
// is measured against the input rather than against terser's.
/** @type {[string, string][]} */
const LET_HEAD_CASES = [
	[
		"a `let` heading a for-await-of",
		"var let; (async function () { for await ((let) of [1]); })(); console.log(typeof let);"
	],
	[
		"a `let` member heading a for-of",
		"var let = {}; for ((let).a of [5]); console.log(let.a);"
	],
	[
		"a `let [` heading a for-in",
		"var let = []; for ((let)[0] in { k: 1 }); console.log(let[0]);"
	],
	[
		"a `let [` heading a for loop",
		"var let = [0]; for ((let)[0] = 3; ; ) break; console.log(let[0]);"
	],
	[
		"a `let [` starting a statement",
		"var let = [1]; (let)[0] = 2; console.log(let[0]);"
	]
];

// terser refuses a body's lexical `arguments` beside the function's own, so with
// corrections off the printer refuses it too, and the print is measured against
// the input.
/** @type {[string, string][]} */
const LEXICAL_ARGUMENTS_CASES = [
	[
		"a `let arguments` beside a parameter default reading `arguments`",
		"var args; function f(x = args = arguments) { let arguments = 5; return [typeof args, args.length, arguments]; } console.log(f(undefined, 7));"
	],
	[
		"a `const arguments` in a body without parameters",
		"function g() { const arguments = 3; return arguments; } console.log(g(1, 2));"
	],
	[
		"a `let arguments` in a generator and a method",
		"function* h(x = arguments.length) { let arguments = x; yield arguments; } var o = { m(y = arguments[0]) { let arguments = y + 1; return arguments; } }; console.log(h(1, 2).next().value, o.m(4));"
	]
];

// Each writes a name where terser writes it as a keyword, through the `improve`
// phase rather than the `correct` one, so terser's bytes are not the measure.
/** @type {[string, string, import("terser").MinifyOptions][]} */
const RESERVED_NAME_CASES = [
	[
		"an arrow naming `await`, its body run inside an async function",
		"var await; const g = () => { await = 1; }; async function f() { g(); } f(); console.log(await);",
		{ compress: { passes: 2, toplevel: true }, mangle: false }
	],
	[
		"an arrow naming `yield`, its body run inside a generator",
		"var yield; const g = () => { yield = 1; }; function* h() { g(); } h().next(); console.log(yield);",
		{ compress: { passes: 2, toplevel: true }, mangle: false }
	],
	[
		"an arrow whose parameter is `await`, kept by the arrow around it in an async function",
		"var sink; async function f() { (() => { sink = (await) => await + 1; })(); } f(); console.log(sink(1));",
		{ compress: { passes: 2 }, mangle: false }
	],
	[
		"an arrow whose parameter is `yield`, kept by the arrow around it in a generator",
		"var sink; function* h() { (() => { sink = (yield) => yield + 1; })(); } h().next(); console.log(sink(1));",
		{ compress: { passes: 2 }, mangle: false }
	],
	[
		"an arrow whose parameter is `await`, kept by the arrow around it in a static block",
		"var sink; class C { static { (() => { sink = (await) => await + 1; })(); } } console.log(sink(1), C.name);",
		{ compress: { passes: 2, toplevel: true }, mangle: false }
	]
];

// Each still inlines, so the name a context reserves holds back only the inline
// that would write it where it is a keyword.
/** @type {[string, string][]} */
const STILL_INLINED_CASES = [
	[
		"a nested function keeping its own context",
		"var await; async function f() { function g() { sink(function () { await = 1; }); } g(); } f();"
	],
	[
		"`await` as a property name",
		"async function f() { function g() { sink({ await: 1 }.await); } g(); } f();"
	],
	[
		"`yield` named where only `await` is reserved",
		"var yield; async function f() { function g() { yield = 1; } g(); } f(); sink(yield);"
	]
];

// The option sets the printer is held to terser under: a build's own, and
// every format option that changes what the stream writes.
/** @type {import("terser").MinifyOptions[]} */
const OUTPUT_OPTIONS = [
	{ compress: { passes: 2 }, mangle: true, format: { comments: false } },
	{ compress: false, mangle: false, format: { comments: "all" } },
	{
		compress: false,
		mangle: false,
		format: { comments: "some", preserve_annotations: true }
	},
	{
		compress: false,
		mangle: true,
		format: {
			// A pattern written as a string, which terser reads but its types omit.
			comments: /** @type {RegExp} */ (/** @type {unknown} */ ("/kept|@lic/i")),
			ascii_only: true,
			ecma: 2020
		}
	},
	{
		compress: false,
		mangle: false,
		format: { ascii_only: true, ecma: 2015, safari10: true, ie8: true }
	},
	{
		compress: false,
		mangle: true,
		format: {
			semicolons: false,
			quote_style: 3,
			keep_quoted_props: true,
			wrap_iife: true
		}
	},
	{
		compress: false,
		mangle: false,
		format: {
			quote_style: 1,
			inline_script: false,
			preamble: "/* preamble */\r\n",
			keep_numbers: true,
			wrap_func_args: true,
			webkit: true,
			braces: true,
			quote_keys: true
		}
	},
	{ compress: false, mangle: false, format: { quote_style: 2, shebang: false } },
	{
		compress: {},
		mangle: true,
		sourceMap: { asObject: true },
		format: {
			comments: (
				/** @type {unknown} */ node,
				/** @type {{ value: string }} */ comment
			) => comment.value.length % 2 === 0
		}
	},
	{ compress: false, mangle: false, format: { beautify: true, comments: "all" } },
	{ compress: false, mangle: false, format: { max_line_len: 40 } }
];

/**
 * Sources chosen for what the stream decides: where a space, a semicolon or a
 * line break goes, how a string is quoted and escaped, and where a comment is.
 * @type {[string, string][]}
 */
// Sources webpack's parser builds a tree for that prints otherwise than the one
// terser's parser builds, each with the difference; a fix retires its entry.
/** @type {Record<string, string>} */
const PARSED_DIFFERENTLY = {
	"templates, tagged and raw":
		"a template's last segment maps one column further on",
	"classes and objects": "a class member's name maps elsewhere",
	"comments in each position":
		"a line comment before `yield;` stays on the statement before it",
	"directives, and strings that would read as one":
		"an escaped directive keeps its escape where terser ends the prologue with `;`",
	"class C { #x; m(o) { return #x in (a ? o : o) && #x in (a, o) && (#x in o) in o; } }":
		"a private `in` drops its right side's parentheses, as terser's own does, but over another tree",
	"import a, * as b from 'c'; import * as d from 'e'; import { 'f g' as h, i } from 'j'; import k from 'l' with { type: 'json' };":
		"an import's attributes map elsewhere",
	"export { a as 'b c', d }; export * as '*' from 'x'; export * as y from 'x'; export * from 'z'; export { e, f, g } from 'h' with { type: 'json' }; export default (a, b);":
		"an export's string names map elsewhere"
};

const OUTPUT_CASES = [
	[
		"operators that would merge without a space",
		"a = b + +c; d = e - -f; g = h / /re/g.source; i = j++ + ++k; l = !--m; n = o-- > p; q = r < !--s;"
	],
	[
		"strings needing each escape and each quote",
		String.raw`sink("a\"b", 'c\'d', "e'f\"g'", "\\ \b \f \n \r \t \v", "\0", "\0" + "1", "\x001", "  ﻿", "é ☃ 😀", "\ud800 \udc00 \ud83d", '\'"\'', "q'\n", 'r"\t');`
	],
	[
		"inline script sequences",
		"sink('</script>', '</SCRIPT ', '<!--', '-->', '<\\/script>', `</script>${a}<!--`);"
	],
	[
		"templates, tagged and raw",
		"sink(`a${b}c\\n${`d${e}`}`, tag`x\\u{61}${y}\\``, String.raw`\\${z}`, `$\\{w}`);"
	],
	[
		"identifiers beyond ASCII",
		String.raw`var été = 1, π = 2, \u{1d49c} = 3, a‌b = 4, ℘ = 5, ᲀᲀ = 6, \u{1e030}\u{1e030} = 7; sink(été + π + \u{1d49c} + a‌b + ℘ + ᲀᲀ + \u{1e030}\u{1e030}, {été, π: 1});`
	],
	[
		"directives, and strings that would read as one",
		`"use strict"; "\\x75se asm";
		function f() { "use strict"; "other"; return 1; }
		function g() { ("use strict"); }
		sink(f, g);`
	],
	[
		"statements a missing semicolon would join",
		`a = b
		(c || d).e()
		f = g
		[h].forEach(i)
		j = k
		\`l\`.m()
		n = o
		+p
		do q(); while (r)
		s: for (;;) { if (t) break s; else continue s }
		var u = function () {}, v = class {}, w = {}
		;(function () {})()
		;[1].x`
	],
	[
		"comments in each position",
		`#!/usr/bin/env node
		/*! banner, kept */
		// @license line
		/* @__PURE__ */ make();
		const kept = /* #__PURE__ */ build(/* argument */ 1) // trailing
		function f() {
			return /* before */ value // after
				+ 1;
		}
		function g() {
			return ( // line comment after return
				a && b
			);
		}
		function* h() { yield /* c */ x; yield // d
			y; }
		async function i() { await /* e */ z; throw /* f */ new Error(); }
		function empty() { /* inside */ }
		if (a) { /* only a comment */ } else { b(); /* after b */ }
		label: // on a label
		for (;;) break label;
		x = /* one */ /* two */ 1;
		sink(1); // first
		/* second */
		sink(2) // third
		/* fourth */;
		sink(f, g, h, i, empty, kept) /* last */`
	],
	[
		"numbers, regular expressions and keywords",
		"sink(0x10, 1e21, 1.5e-7, .5, 5., 0b101, 1_000, 10n, /[/]\\//gu, /<\\/script>/, void 0, typeof x, x in y, x instanceof Y, a ** -b, (-a) ** b, new (f())(), new f, a?.b?.[c]?.(d));"
	],
	[
		"regular expressions escaping characters beyond ASCII",
		"sink(/\\🏳0\\🌈️\\☺/, /\\\\é[\\é]\\x41/g);"
	],
	[
		"asm.js, whose numbers are printed as written",
		`function module(stdlib) { "use asm"; var x = 1.0, y = 0x10; function f() { return +(x + 2.50); } return { f: f }; }
		sink(module, 1.0);`
	],
	[
		"parentheses the tree does not hold",
		"(function () {})(); (() => {})(); ({}).x; (a, b); x = (a, b); (async () => {})(); (class {}).y; !function () {}(); for (var i = (0 in x); i;) ; a = (b = c); x = ({ a } = y);"
	],
	[
		"classes and objects",
		`class A extends (B, C) { static #p = 1; #q; static { init(); } get [k]() { return this.#q; } set v(x) {} async *gen() {} static async m() {} 'quoted key'() {} 1() {} }
		sink({ a: 1, "b": 2, "c-d": 3, 4: 5, [e]: 6, get g() { return 1; }, set g(x) {}, h() {}, async i() {}, *j() {}, ...k, l, if: 1, "\\u0061": 2 });`
	],
	[
		"output long enough to be committed in parts",
		Array.from(
			{ length: 400 },
			(_, i) =>
				`/*! part ${i} */ function part${i}(value) { "use strict"; return value + ${i}; // line ${i}\n}`
		).join("\n")
	]
];

/**
 * Sources chosen for what the code generators decide: where a parenthesis,
 * brace or keyword goes around each kind of node.
 * @type {string[]}
 */
const CODEGEN_CASES = [
	"if (a); else b(); for (;;); while (a) ; label: ;",
	"if (a) function f() {}",
	"if (a) do x(); while (b); else y();",
	"if (a) { if (b) c(); } else d();",
	"for (var f = function () { return a in b; }, g = (() => a in b); ;) break;",
	"x = [0.0001, 0.00012, 1e-7, 1000, 1e21, 0.5];",
	"x = { 1e3: 1, 10: 2, 0x10: 3, 1.5: 4 };",
	"({}.t)`x`; ({}).a.b; ({} = a);",
	"(function () {}).call(); (function () {})(); new (a())(); new (a().b)(); new (a.b()); (a, b).c; f((a, b)); (a = b).c; (a ? b : c).d; (a ? b : c)(); -(a ? b : c);",
	"(-1).toString(); (1).x; (1.5).x; (-0.5) ** 2; (-a) ** 2; (a || b) ?? c; (a ?? b) || c; a ?? (b && c);",
	"(async () => 1)(); (() => 1).x; (a => a)?.x; typeof (a => a); (a => a) || b; x = (a => a) ? 1 : 2;",
	"class C { #x; m(o) { return #x in (a ? o : o) && #x in (a, o) && (#x in o) in o; } }",
	"function* g() { x = yield; (yield a).b; (yield a)(); a + (yield b); -(yield); x = yield a ? b : c; }",
	"async function h() { (await x).y; (await x)(); -(await x); new (await x)(); for await (const v of w); }",
	"debugger; 'use strict'; function d() { 'use asm'; return; }",
	"class A extends B { [a]() {} get [b]() {} set [c](v) {} static *[d]() {} async [e]() {} m() { super.m(); return new.target; } }",
	"x = `a${b}c${d}`; x = tag`a${b}`;",
	"f = () => { return; }; g = () => { return {}; }; h = () => ({}).a; i = () => ({ a } = b);",
	"if (a) b(); else if (c) d(); else { e(); }",
	"switch (a) {} switch (a) { case 1: default: }",
	"import a, * as b from 'c'; import * as d from 'e'; import { 'f g' as h, i } from 'j'; import k from 'l' with { type: 'json' };",
	"export { a as 'b c', d }; export * as '*' from 'x'; export * as y from 'x'; export * from 'z'; export { e, f, g } from 'h' with { type: 'json' }; export default (a, b);",
	"import defer * as ns from 'm'; import source s from 'm'; import.meta.url; import('x'); import.source('x'); import.defer('x');",
	"a?.[b]; a?.b(); a?.(); a?.[b]?.(c); (a?.b).c;",
	"(5).toString(); 5.5.toString(); 0x10.toString(); 1e21.x; (-5).x;",
	"x = /<\\/script>/; y = a < /script>/.x; z = /a/ instanceof RegExp; w = /a/ in b; v = /a/gimsuy;",
	"({ a = 1 } = b); ({ a: a = 1 } = b); ({ 'a': a = 2 } = b); ({ [a]: b = 1 } = c);",
	"new (a.b.c)(); new (a().b.c)(); new a; new (function () {})(); new (class {})();",
	"x = (a, b) ? c : d; x = a ? (b, c) : d; x = (a = b) ? c : d; (a = b) ? c : d; x = !(a = b);"
];

/**
 * Every node terser sizes in a script, `with` included, which a module forbids.
 */
const SIZED_SCRIPT = `"a directive"; debugger; {} ;
label: for (;;) { break label; }
outer: do { continue outer; } while (a);
while (b) break;
for (var i in o) c();
for (const v of w) d();
with (o) e;
switch (x) { case 1: f(); break; default: g(); }
try { h(); } catch { } try { h(); } catch (error) { } finally { k(); }
if (a) b(); else c();
throw new Error("x", 1);
var [p, ...q] = r, { s, t: [u] } = v;
let fn = (a, b = 1, ...c) => a, one = x => x * 2, block = async () => { return await 1; };
const tpl = tag\`a\${b}c\${d}\`, re = /x+/gi, str = 'q"', num = 1.5e3, big = 12n;
x = [1, , 3], y = { a, b: 1, [c]: 2, get d() { return 1; }, set d(v) {}, e() {}, async *f() { yield 1; }, "g h": 1, 1: 2 };
({ a } = y);
z = null + NaN + undefined + Infinity + true + false + void 0 + typeof a + -a + !b + ~c + 0.5 + (a + +b) + (a - -b) + a?.b + a?.[b] + a?.(b) + a.b + a[b] + (a, b) + (a ? b : c) + (a || b) + (a ?? b) + a ** b;
class A extends B { static x = 1; y; #z = 2; static #w; static { f(); } constructor() { super(); new.target; } get g() { return this.#z; } set g(v) {} static m() {} *gen() {} async am() {} #pm() { return #z in this; } get #pg() { return 1; } set #pg(v) {} static get sg() {} }
new (class {})();
function named(a) { return arguments; }
async function* generate() { for await (const v of w) yield* v; }`;

/**
 * Every node terser sizes only in a module. terser cannot size an exported
 * default function, whose size asks for a stack the export does not pass.
 */
const SIZED_MODULE = `import d, { a as b, c } from "m"; import * as ns from "n"; import "side"; import json from "j" with { type: "json" };
export { b, c as e }; export * from "o"; export * as p from "q"; export default [import.meta.url, import("x"), import.source("y")];
export const k = 1; export class K {}
{ using x = y; } async function f() { await using z = w; }`;

/**
 * Properties the mangler reads each way terser does: quoted, computed, in a
 * `defineProperty`, an `in`, and the `@__KEY__` and `@__MANGLE_PROP__` notes.
 */
const MANGLED_PROPERTIES = `var obj = { alpha: 1, "beta": 2, [c ? "gamma" : "delta"]: 3, get eps() { return 1; }, method() {}, 42: 1 };
obj.alpha = obj.beta + obj["gamma"] + obj[(0, "delta")] + obj[c ? "eps" : "method"];
Object.defineProperty(obj, "zeta", { value: 1 });
sink("eta" in obj, /*@__KEY__*/ "theta", obj[/*@__MANGLE_PROP__*/ "iota"]);
var ann = { /*@__MANGLE_PROP__*/ kappa: 1 }; ann.kappa++;
undeclared.lambda = 1;
class Shape { #priv = 1; field = 2; get #getter() { return 1; } method() { return this.#priv + this.field + this.#getter; } }
sink(obj, new Shape());`;

/**
 * Names the mangler keeps, moves or hands out apart: a function declared in a
 * block, a named and a kept function value, a catch, a label and `arguments`.
 */
const MANGLED_NAMES = `var counter = function () { return 1; };
function outer(first, second) {
	if (first) { function inBlock() { return second; } inBlock(); }
	var named = function (argument) { return argument + counter(); };
	var keptLambda = function () { return 1; };
	try { first(); } catch (error) { second(error); }
	function inner() { var arrow = () => arguments[0]; return arrow(); }
	label: for (;;) { break label; }
	return [named, keptLambda, inner(), first.prop, first["quoted"]];
}
sink(outer);`;

/**
 * Exported names, which a name cache and a toplevel mangle keep.
 */
const MANGLED_MODULE =
	"export var kept = 1; var hidden = 2; export { hidden as shown }; export default function main(alpha) { return alpha + kept + hidden; }";

// Every source of the tables above, which the ESTree printer is held to.
const TABLE_SOURCES = [
	...OUTPUT_CASES.map(([, source]) => source),
	...CODEGEN_CASES,
	SIZED_SCRIPT,
	SIZED_MODULE,
	MANGLED_PROPERTIES,
	MANGLED_NAMES,
	MANGLED_MODULE,
	...CASES.map(([, source]) => source)
];

/**
 * Expressions for what the ESTree printer decides that the tables above leave
 * out: parentheses, spaces between operators, and keys.
 * @type {string[]}
 */
const ESTREE_PRINT_CASES = [
	"x = a > --b; y = c-- > d; z = !--e; w = - --f; v = -(-g); u = +(+h); t = typeof typeof i; s = - -j; r = a-- >> b;",
	"x = 1..toString() + 1.5.toFixed() + 0x10.y + 1e21.w + .5.v + 5n.u + (-5n).t + 1e300 + 0.000001 + 1000000 + 0xff + 1_000 + 0x1fn;",
	String.raw`x = /a<\/script/g.test(y) || /x/ in z || /y/ instanceof w || a < /script/ || /\u{1F600}/u.x || /é/;`,
	"new (a.b().c); new (a`x`); new (b.c); new a.b; new (new a)(); (new a).b; (new a)``; new a()(); new (a.b.c); new (function () { a(); }.b);",
	"x = class { #p; q = (o) => #p in o && (#p in o) in o && #p in (o ? o : o) && (#p in o) + 1 && !(#p in o) && (#p in o)(); r = a ?? (b || c); static s = (a ?? b) && c; [t] = 1; 'u' = 2; 4 = 5; static #v = 6; static {} constructor() {} get a() {} set a(b) {} static async *m() {} get #w() {} set #w(v) {} #z() {} 'quoted'() {} 7() {} };",
	"async function f() { await (a, b); await a.b; await a(); await -a; await 1; await (await a); await {}; await (a ? b : c); await this; await class {}; (await a)(); (await a).b; (await a) ** 2; !await a; x = await a; }",
	"function* g() { yield; yield* a; (yield a) + 1; x = yield b; (yield a)(); (yield a).b; (yield a) ? 1 : 2; !(yield a); [...(yield a)]; f(yield a, yield); ({ a: yield }); }",
	"(function () {})(); (function () {}).call(); x = function () {}; f(function () {}, () => 1); (() => {}).x; (a => a) ? 1 : 2; a || (() => 1); !(() => 1); (() => 1)(); x = async (a, b) => ({}); y = async a => ({}).x; z = () => ({}) ? 1 : 2; w = () => ({}).x(); v = ([a], { b }, ...c) => a; (function () {})().x = 1; (function () {}).x = 1; (function () {})()``; (function* () {}); (async function () {}); (async function* f() {});",
	"({}).x; ({} = a); ({ a } = b); [a] = b; ({}).x = 1; ({})(); ({}).x``; ({}) ? 1 : 2; ({}) + 1; ({}).a++; ({}, 1); ({ a, b: c = 1, 'd': d, [e]: f, ...g } = h); ({ 'a': a } = b); ({ 1: a, 'b c': b } = c); ({ a: { b } } = c);",
	"x = { a, b: c, 'd': d, 1: e, [f]: g, ...h, get i() {}, set j(k) {}, *l() {}, async m() {}, async *n() {}, 'o'() {}, if: p, 'q r': s, '1': t, 1.5: u, '01': v, async: w, get: y, set: z, 'é': 1, 'class': 2, [a + b]() {}, get [c]() {}, 0b11: 3, 1e3: 4, NaN: NaN, undefined, this: this };",
	"x = `a${b}c${`d${e}`}`; tag`a\\u{41}${b}`; (a + b)`x`; (a, b)`x`; (a ? b : c)`x`; (!a)`x`; ({}).a`x`; (() => 1)`x`; a.b`x`; (function () {})`x`; (a = b)`x`; x = `\\u{1F600}${'é'}`; x = `\\${a}`;",
	"a?.b; a?.[b]; a?.(); (a?.b).c; (a?.b)(); a?.b.c(); new (a?.b)(); (a?.()).b; a?.b?.c?.(d)?.[e];",
	"x = (a, b); f((a, b)); [(a, b)]; ({ a: (b, c) }); (a, b) ? c : d; a ? (b, c) : (d, e); x = `${(a, b)}`; [...(a, b)]; f(...(a, b)); (a, b).c; (a, b)[c]; (a, b)(); -(a, b); a + (b, c); x = () => (a, b); ({ [(a, b)]: c });",
	"x = a = b ? c : d; (a = b) ? c : d; (a ? b : c) ? d : e; (a = b).c; (a ? b : c)(); !(a = b); a + (b = c); a, b = c; x = a => b = c; x = (a ? b : c) || d; x = a || (b ? c : d); a = b = c; a += b -= c; x = { a: b = c }; [a = b] = c; f(a = b);",
	String.raw`x = 'é \0' + "'" + '"' + '\'' + "\"" + true + null + false + this + 'a\nb' + '\x7f\x80' + '😀' + '\ud83d' + '</script>';`,
	"delete a[0], void 0, typeof a, a++ + ++b, a-- - --b, (-a) ** 2, (+a) ** 2, (++a) ** 2, (a++) ** 2, a ** -b, (a ** b) ** c, a ** b ** c, (a * b) ** c, a - (b - c), a - b - c, a * (b + c), (a, b) ** c, !(a ** b), (typeof a) ** 2, (void a) ** 2;",
	"(a || b) ?? c; (a && b) ?? c; a ?? (b || c); a ?? (b && c); (a ?? b) || c; (a ?? b) && c; a ?? b ?? c; (a ?? b) ?? c; a || b && c; (a || b) && c; a in b in c; a in (b in c); a instanceof (b instanceof c);",
	"a = class extends (a, b) {}; a = class extends a.b {}; a = class extends class {} {}; a = class extends function () {} {}; a = class extends f() {}; a = class extends (a ? b : c) {}; a = class extends this {}; a = class B extends C {}; (class {}).x; (class {})(); x = class { m() { super.m(); super['n'](); } };",
	"x = [, , 1, , ]; [, a, , ] = b; [...a] = b; f(...a); x = []; x = [,]; x = [a, , b]; ({ ...a } = b); [{ a } = b, [c] = d] = e;",
	String.raw`x = a.if + a.class + a['b c'] + a['é'] + a['\u{1F600}'] + a['1'] + a.ℹ + a?.if + a['𝐀'];`,
	"function f() { new.target; (new.target).x; new new.target; }",
	"x = 0.0001; x = 1e-7; x = 1.5e-10; x = 123456789e5; x = 1e21; x = -0; x = 2 ** 53; x = 0x123456; x = 1/0; x = -1/0; x = 0/0;",
	"x = (1, eval)('a'); x = (0, a.b)(); x = (a, b.c)``; x = void (a, b); x = a, b, c;",
	"f = () => ({}).x``; g = () => ({})?.a; h = () => ({}).a++; i = () => ++({}).a; j = () => ({}).a?.(); k = () => a``; l = () => a?.b; m = () => a++; n = () => ({}) + 1; o = () => ({} = a);",
	"({})?.a; ({}).a?.b; (function () {})?.(); (class {})?.a;",
	"new (a[[b]].c); new (a[[b()]].c); new (a[b].c); new (a[(() => b())()].c); new (a[function () {}].c);",
	"x = class { #p; q = (o) => [o.#p, o?.#p, #p in (a + b), #p in (a < b), #p in (a || b), #p in (#p in o), #p in o ** 2, -(#p in o)]; };"
];

/**
 * Modules for the imports and exports the ESTree printer prints.
 * @type {string[]}
 */
const ESTREE_PRINT_MODULE_STATEMENT_CASES = [
	"import a, { b as c, d, 'e f' as g, \"h\" as h, default as i } from 'j' with { type: 'json', 'k': 'l' }; import n, * as o from 'p'; import * as q from 'r'; import { '*' as s } from 't'; import {} from 'u'; import source v from 'w'; import defer * as x from 'y'; export { a, c as z, d as 'y z', i as j }; export {}; export { k as l, m as 'n' } from 'o'; export * from 'p'; export * as q from 'r'; export * as 'r s' from 's'; export * as '*' from 't'; export { '*' as star } from 'u'; export { 'v w' } from 'v'; export { 'w' as x } from 'y' with { type: 'json' }; export default (function () {})(); export var t = 1, u = (v, w); export let ab; export const ac = 1; export function ad() {} export class ae {}; await using af = ag;",
	"export default function () {} export function* f() {}",
	"export default class {}; export async function f() {}",
	"export default (a, b);",
	"export default function f() {}",
	"export default class C {}",
	"export default async () => {};",
	"export * from 'a' with { type: 'json' }; export * as b from 'c' with { type: 'json' };"
];

/**
 * Sources only a module reads, whose expressions the ESTree printer is held to.
 * @type {string[]}
 */
const ESTREE_PRINT_MODULE_CASES = [
	"import.meta.x; import('a'); import('a', { with: { type: 'json' } }); import.source('a'); import.defer('b'); (import.meta).x; await (a, b); !await a;"
];

/**
 * Statements for what the ESTree printer decides that the tables above leave
 * out: braces, semicolons, `in` inside a loop's head, and directives.
 * @type {string[]}
 */
const ESTREE_PRINT_STATEMENT_CASES = [
	"for (var a = (b in c);;); for (a = (b in c);;); for (var a = () => (b in c);;); for (var a = function () { b in c; };;); for (var a = [b in c];;); for (; a in b;) c(); for (;;) var d = e in f; for (var a in b) var c = d in e; for (let a of (b, c)); for ((a in b).c in d);",
	"if (a) { if (b) c(); } else d(); if (a) if (b) c(); else d(); else e(); if (a) for (;;) if (b) c(); else d(); else e(); if (a) for (;;) if (b) c(); else e(); if (a) do b(); while (c); else d(); if (a); else; while (a); with (a) ; with (a) { b(); } l: for (;;) if (a) break l; else continue l;",
	"switch (a) {} switch (a) { case 1: case 2: b(); break; default: ; } try { a(); } catch { } finally { } try {} catch ({ a, b }) { c(); } do ; while (a); do { a(); } while (b); do a(); while (b);",
	"'use strict'; 'use asm'; ; 'not a directive'; x = 0x10 + 1.0; function f() { 'use asm'; return 0x10 + 1.0; } function g() { a(); 'b'; return 0x10; } (function () { ; 'use asm'; b(); })(); x = () => { 'not'; a(); }; class C { static { 'not'; } m() { 'use asm'; return 0x10; } }",
	"function f() { return; } function g() { throw a; } var a = 1, b, [c] = d, { e } = f; let i = 1; const h = 2; label: { break label; } debugger;"
];

/**
 * Comments where the ESTree printer reads them: before a keyword's value and
 * down its leftmost edge, inside empty braces, after statements, and first.
 * @type {string[]}
 */
const ESTREE_PRINT_COMMENT_CASES = [
	"#!/usr/bin/env node\n/*! kept */ 'use strict'; // after\na(); /* @lic */",
	"function f() { return /* a */ b; } function g() { return (/* a */ b) + c; } function h() { return /* a */ b.c(/* d */ e)[f] ? g : h; } function i() { throw /* x */ a, b; } function j() { return (\n// line\na); }",
	"async function f() { await /* a */ b; await (/* b */ c)(); x = await /* c */ d++; } function* g() { yield /* a */ b; yield (/* b */ c) || d; yield; } x = class { #p; m(o) { return /* a */ #p in o; } n(o) { return /* a */ o.#p; } }; function h() { return /* a */ ++b; } function i() { return /* a */ b = c; }",
	"function f() { /* inner */ } x = { /* inner */ }; switch (a) { /* inner */ } class C { /* inner */ } x = function () { // line\n}; x = () => { /* inner */ }; if (a) { /* inner */ } try { /* t */ } catch { /* c */ } finally { /* f */ }",
	"a(); // after a\nb() /* after b */; c = /* before d */ d /* after d */ + e; x = [/* a */ 1, /* b */ 2 /* c */]; f(/* arg */ g, h /* after h */);",
	"x = /*@__PURE__*/ f(); y = /* #__PURE__ */ new C(); /*#__NO_SIDE_EFFECTS__*/ function g() {} export const h = /*@__PURE__*/ (() => 1)();",
	"label: /* l */ for (;;) { /* body */ break label; } var a = /* a */ 1, /* b */ b = 2; if (/* c */ a) /* d */ b(); else /* e */ c();"
];

// The format options that change how a statement prints, past an expression's.
/** @type {EXPECTED_OBJECT[]} */
const ESTREE_PRINT_STATEMENT_FORMATS = [
	{ semicolons: false },
	{ ie8: true, ecma: 5 }
];

// The format options that change how an expression prints.
/** @type {EXPECTED_OBJECT[]} */
const ESTREE_PRINT_FORMATS = [
	{},
	{ ascii_only: true, ecma: 2020 },
	{ ascii_only: true, ecma: 5 },
	{ quote_style: 1, keep_quoted_props: true },
	{ quote_style: 2, keep_numbers: true },
	{ quote_style: 3, wrap_iife: true, wrap_func_args: true },
	{ ecma: 5, ie8: true, safari10: true, webkit: true },
	{ quote_keys: true, shorthand: false },
	{ quote_keys: true, ecma: 2020 },
	{ keep_quoted_props: true, ecma: 2020 },
	{ max_line_len: 40 }
];

// Every format option a whole program is printed under.
const ESTREE_PRINT_PROGRAM_FORMATS = [
	...ESTREE_PRINT_FORMATS,
	...ESTREE_PRINT_STATEMENT_FORMATS
];

describe("syntax-printer", () => {
	it("should install every phase", async () => {
		const printer = await load();
		expect(typeof printer.minify).toBe("function");
		expect(printer.phases).toEqual(PHASES.map((phase) => phase.name));
		expect(await load()).toBe(printer);
	});

	it("should port every compress helper the phases read under terser's name", async () => {
		const modules = await loadTerserSources(importTerserSource);
		const helpers = createCompressHelpers(modules);
		const printerSource = require("fs").readFileSync(
			require.resolve("../../lib/javascript/syntax-printer"),
			"utf8"
		);
		/** @type {Record<"common" | "inference" | "flags" | "utils", Set<string>>} */
		const read = {
			common: new Set(),
			inference: new Set(),
			flags: new Set(),
			utils: new Set()
		};
		const destructured =
			/const\s*\{([^}]*)\}\s*=\s*(?:modules\.)?(common|inference|flags|utils)\s*;/g;
		let match;
		while ((match = destructured.exec(printerSource)) !== null) {
			for (const part of match[1].split(",")) {
				const name = part.split(":")[0].trim();
				if (name) read[/** @type {keyof typeof read} */ (match[2])].add(name);
			}
		}
		// The lookbehind skips file names such as `compress/common.js`.
		const accessed =
			/(?<![\w/.`$-])(?:modules\.)?(common|inference|flags|utils)\.([A-Za-z_$][\w$]*)/g;
		while ((match = accessed.exec(printerSource)) !== null) {
			read[/** @type {keyof typeof read} */ (match[1])].add(match[2]);
		}

		for (const helper of /** @type {(keyof typeof read)[]} */ (
			Object.keys(read)
		)) {
			const ported = Object.keys(helpers[helper]).sort();
			expect(ported).toEqual([...read[helper]].sort());
			for (const name of ported) {
				expect(modules[helper]).toHaveProperty(name);
				expect(typeof helpers[helper][name]).toBe(
					typeof modules[helper][name]
				);
			}
		}

		expect(Object.keys(helpers.flags).sort()).toEqual(
			Object.keys(modules.flags).sort()
		);
		for (const [name, value] of Object.entries(modules.flags)) {
			if (typeof value === "number") expect(helpers.flags[name]).toBe(value);
		}
	});

	it("should keep the quirks of terser's compress helpers", async () => {
		const modules = await loadTerserSources(importTerserSource);
		// webpack's helpers hand a unary operation its operand under ESTree's
		// name, which terser's constructor reads as `expression`.
		const TerserUnaryPrefix = /** @type {EXPECTED_ANY} */ (modules.ast.UnaryPrefixNode);
		/**
		 * @param {EXPECTED_ANY} props the fields, ESTree's names included
		 * @returns {EXPECTED_ANY} terser's node
		 */
		function UnaryPrefixNode(props) {
			return new TerserUnaryPrefix({ ...props, expression: props.argument });
		}
		UnaryPrefixNode.prototype = TerserUnaryPrefix.prototype;
		modules.ast.UnaryPrefixNode = /** @type {EXPECTED_ANY} */ (
			/** @type {unknown} */ (UnaryPrefixNode)
		);
		let helpers;
		try {
			helpers = createCompressHelpers(modules);
		} finally {
			modules.ast.UnaryPrefixNode = TerserUnaryPrefix;
		}
		const { common, inference, flags, utils } = helpers;
		const { ast } = modules;

		const words = ["b", "a"];
		expect(utils.makePredicate(words)).toEqual(new Set(["a", "b"]));
		expect(words).toEqual(["a", "b"]);
		expect(utils.makePredicate("x y")).toEqual(
			modules.utils.makePredicate("x y")
		);
		expect(common.identifier_atom).toEqual(modules.common.identifier_atom);
		for (const name of ["bitwise_binop", "lazy_op", "unary_side_effects"]) {
			expect(inference[name]).toEqual(modules.inference[name]);
		}

		for (const source of ["a\nb", "a\\\nb", "a\\\\\nb", "\0\r\u2028\u2029"]) {
			expect(utils.regexp_source_fix(source)).toBe(
				modules.utils.regexp_source_fix(source)
			);
		}
		for (const source of ["^a+$", "(a+)+"]) {
			expect(utils.regexp_is_safe(source)).toBe(
				modules.utils.regexp_is_safe(source)
			);
		}

		const node = new ast.AST_Number({ value: 1 });
		node.flags = 0;
		flags.set_flag(node, flags.TOP | flags.UNUSED);
		flags.clear_flag(node, flags.UNUSED);
		expect(flags.has_flag(node, flags.TOP)).toBe(flags.TOP);
		expect(node.flags).toBe(modules.flags.TOP);

		const list = [1, 2, 1, 3];
		utils.remove(list, 1);
		expect(list).toEqual([2, 3]);
		expect(utils.member(2, list)).toBe(true);
		expect(utils.return_false()).toBe(false);

		// `MAP` transforms with webpack's own walk, over webpack's own nodes.
		const own = (await load()).modules;
		const nodes = [
			own.ast.NumberNode({ value: 1 }),
			own.ast.NumberNode({ value: 2 }),
			own.ast.NumberNode({ value: 3 })
		];
		const spliced = own.ast.NumberNode({ value: 4 });
		const walker = own.ast.createTransformer((/** @type {EXPECTED_ANY} */ item) => {
			if (item === nodes[0]) return own.utils.MAP.skip;
			if (item === nodes[1]) return own.utils.MAP.splice([spliced, spliced]);
			return item;
		});
		expect(own.utils.MAP(nodes, walker)).toEqual([spliced, spliced, nodes[2]]);

		/**
		 * A constant's node as plain data, terser's `expression` and ESTree's
		 * `argument` read as one operand.
		 * @param {EXPECTED_ANY} built a node
		 * @returns {EXPECTED_ANY} its type, operator, value and operand
		 */
		const shapeOf = (built) =>
			built && kindName(built)
				? {
						TYPE: kindName(built),
						operator: built.operator,
						value: built.value,
						operand: shapeOf(built.argument || built.expression)
					}
				: built;
		for (const value of [
			"a",
			0,
			-0,
			-1,
			Number.NaN,
			Infinity,
			-Infinity,
			true,
			null,
			undefined,
			/a\n/g
		]) {
			expect(shapeOf(common.make_node_from_constant(value, node))).toEqual(
				shapeOf(modules.common.make_node_from_constant(value, node))
			);
		}
		expect(() => common.make_node_from_constant({}, node)).toThrow(
			"Can't handle constant of type: object"
		);
		expect(() => common.make_sequence(node, [])).toThrow(
			"trying to create a sequence with length zero!"
		);
		expect(common.make_sequence(node, [node])).toBe(node);
	});

	for (const [name, source, options] of CASES) {
		it(`should mangle exactly as terser does: ${name}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			const settings = {
				compress: { passes: 2 },
				mangle: true,
				...options
			};
			const ours = await minify(source, JSON.parse(JSON.stringify(settings)));
			const theirs = await reference.minify(
				source,
				JSON.parse(JSON.stringify(settings))
			);
			expect(ours.code).toBe(theirs.code);
			expect(ours.code).toMatchSnapshot();
		});
	}

	it("should print and map a valueless yield in a loop head as terser does", async () => {
		const { minify } = await load();
		const reference = terserReference();
		/** @type {[string, import("terser").MinifyOptions][]} */
		const sources = [
			// A `yield` with no value, read for an `in` a loop's head would take.
			["function* g() { for (var a = (yield, b in c); ;); }", { compress: false }]
		];
		for (const [source, options] of sources) {
			const settings = { mangle: false, sourceMap: { asObject: true }, ...options };
			const ours = await minify(source, JSON.parse(JSON.stringify(settings)));
			const theirs = await reference.minify(
				source,
				JSON.parse(JSON.stringify(settings))
			);
			expect([ours.code, ours.map]).toEqual([theirs.code, theirs.map]);
		}
	});

	it("should mangle as terser does under each option the fast path leaves out", async () => {
		const { minify } = await load();
		const reference = terserReference();
		const source = `var counter = function () { return 1; };
			function outer(first, second) {
				label: for (var i = 0; i < 2; i++) { if (i) break label; }
				try { first(); } catch (error) { second(error); }
				if (first) { function inBlock() { return second; } inBlock(); }
				class Shape { area() { return first; } }
				var named = function inner(argument) { return argument + counter(); };
				return [new Shape(), named, (function f(f) { return f; })(1)];
			}
			export { outer };`;
		const variants = [
			{ mangle: { keep_fnames: true } },
			{ mangle: { keep_fnames: /^inner$/, keep_classnames: true } },
			{ mangle: { ie8: true } },
			{ mangle: { safari10: true } },
			{ mangle: { toplevel: true, keep_classnames: /^Sh/ } },
			{ compress: false, mangle: true, rename: true },
			{ compress: { passes: 2 }, mangle: { reserved: ["first"] }, rename: true }
		];
		for (const variant of variants) {
			const settings = () => ({
				compress: { passes: 2 },
				module: true,
				...JSON.parse(JSON.stringify(variant)),
				...(variant.mangle && typeof variant.mangle === "object"
					? { mangle: { ...variant.mangle } }
					: {})
			});
			const ours = await minify(source, settings());
			const theirs = await reference.minify(source, settings());
			expect([variant, ours.code]).toEqual([variant, theirs.code]);
		}
		// A name cache carries the names one minify handed out into the next.
		const ourCache = {};
		const theirCache = {};
		for (const input of [source, "var counter = 2; export { counter };"]) {
			const options = () => ({ mangle: { toplevel: true } });
			const ours = await minify(input, { ...options(), nameCache: ourCache });
			const theirs = await reference.minify(input, {
				...options(),
				nameCache: theirCache
			});
			expect(ours.code).toBe(theirs.code);
		}
		expect(ourCache).toEqual(theirCache);
	});

	it("should minify a source too large to keep its buffers as terser does", async () => {
		const { minify } = await load();
		const reference = terserReference();
		// Past the 8 MiB the conversion keeps its buffers for, in a comment both
		// parsers skip quickly.
		const source = `var box = { width: 2, height: 3 }; sink(box);\n/*${"x".repeat(
			1 << 23
		)}*/`;
		const options = () => ({ compress: false, mangle: false });
		const ours = await minify(source, options());
		const theirs = await reference.minify(source, options());

		expect(ours.code).toBe(theirs.code);
	});

	it("should minify a source denser in tokens than its buffers start as terser does", async () => {
		const { minify } = await load();
		const reference = terserReference();
		// Two characters a token: past the quarter of the length the buffers
		// start at, however large an earlier source left them here.
		const source = `sink([${"1,".repeat(200000)}]);`;
		const options = () => ({ compress: false, mangle: false });
		const ours = await minify(source, options());
		const theirs = await reference.minify(source, options());

		expect(ours.code).toBe(theirs.code);
	});

	it("should mangle by the characters of an output too long to hold whole as terser does", async () => {
		const { minify } = await load();
		const reference = terserReference();
		// Past the parts the frequency print holds before it counts them.
		const functions = [];
		for (let i = 0; i < 4000; i++) {
			functions.push(
				`function f${i}(first, second) { var third = first + second; sink("${"qz".repeat(
					20 + (i % 7)
				)}", third); }`
			);
		}
		const source = `${functions.join("\n")}\nsink(f0, f3999);`;
		const options = () => ({ compress: false, mangle: true });
		const ours = await minify(source, options());
		const theirs = await reference.minify(source, options());

		expect(String(ours.code).length).toBeGreaterThan(300000);
		expect(ours.code).toBe(theirs.code);
	});

	it("should build factories from plain identifiers alone", () => {
		const { plainIdentifier } = require("../../lib/javascript/syntax-printer");

		expect(plainIdentifier("_annotations")).toBe("_annotations");
		expect(() => plainIdentifier("a-b")).toThrow("Not a plain identifier: a-b");
	});

	it("should print a node a released tree holds twice", async () => {
		const { modules } = await load();
		const toplevel = modules.parse.parse("sink(1);");
		toplevel.body.push(toplevel.body[0]);
		const output = modules.output.OutputStream();
		modules.printProgram(toplevel, output, true);

		expect(output.get()).toBe("sink(1);sink(1);");
		expect(toplevel.body[1]).toBe(toplevel.body[0]);
	});

	it("should leave a name terser cannot mangle alone", async () => {
		const { minify } = await load();
		const result = await minify("function top(argument) { return argument; }", {
			compress: false,
			mangle: true
		});

		expect(result.code).toBe("function top(n){return n}");
	});

	it("should mangle a toplevel name when asked to", async () => {
		const { minify } = await load();
		const result = await minify(
			"function top(argument) { return argument; } top(1);",
			{ compress: false, mangle: { toplevel: true } }
		);

		expect(result.code).toBe("function n(n){return n}n(1);");
	});

	for (const [name, source] of OUTPUT_CASES) {
		it(`should print exactly as terser does: ${name}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			let differs = false;
			for (const settings of OUTPUT_OPTIONS) {
				// The union the table infers does not narrow to terser's options.
				const options = () =>
					/** @type {EXPECTED_ANY} */ ({
						...settings,
						format: { ...settings.format }
					});
				const ours = await unimproved(() =>
					minify({ "input.js": source }, options())
				);
				// The printer writes minified output only, so it is held to terser's.
				const referenceOptions = options();
				for (const name of IGNORED_FORMAT_OPTIONS) {
					delete (/** @type {Record<string, unknown>} */ (referenceOptions.format))[
						name
					];
				}
				const theirs = await reference.minify(
					{ "input.js": source },
					referenceOptions
				);
				if (Object.prototype.hasOwnProperty.call(PARSED_DIFFERENTLY, name)) {
					differs =
						differs ||
						ours.code !== theirs.code ||
						JSON.stringify(ours.map) !== JSON.stringify(theirs.map);
					continue;
				}
				expect(ours.code).toBe(theirs.code);
				expect(ours.map).toEqual(theirs.map);
			}
			if (Object.prototype.hasOwnProperty.call(PARSED_DIFFERENTLY, name)) {
				// A listed difference that is gone is retired from the list.
				expect(differs).toBe(true);
			}
			const { code } = await minify(
				source,
				/** @type {EXPECTED_ANY} */ (OUTPUT_OPTIONS[0])
			);
			expect(code).toMatchSnapshot();
		});
	}

	for (const source of CODEGEN_CASES) {
		it(`should generate code as terser does: ${source}`, async () => {
			const { minify, improvements } = await load();
			if (!improvements) throw new Error("the improve phase is not installed");
			// terser has no improve phase, so its output is held to webpack's without one.
			improvements.enabled = false;
			try {
				const reference = terserReference();
				let differs = false;
				for (const settings of OUTPUT_OPTIONS) {
					// The union the table infers does not narrow to terser's options.
					const options = () =>
						/** @type {EXPECTED_ANY} */ ({
							...settings,
							format: { ...settings.format }
						});
					// Nor has it a correct phase, which writes more where terser assumes less.
					const ours = await uncorrected(() =>
						minify({ "input.js": source }, options())
					);
					const referenceOptions = options();
					for (const name of IGNORED_FORMAT_OPTIONS) {
						delete (/** @type {Record<string, unknown>} */ (referenceOptions.format))[
							name
						];
					}
					const theirs = await reference.minify(
						{ "input.js": source },
						referenceOptions
					);
					if (Object.prototype.hasOwnProperty.call(PARSED_DIFFERENTLY, source)) {
						differs =
							differs ||
							ours.code !== theirs.code ||
							JSON.stringify(ours.map) !== JSON.stringify(theirs.map);
						continue;
					}
					expect(ours.code).toBe(theirs.code);
					expect(ours.map).toEqual(theirs.map);
				}
				if (Object.prototype.hasOwnProperty.call(PARSED_DIFFERENTLY, source)) {
					// A listed difference that is gone is retired from the list.
					expect(differs).toBe(true);
				}
			} finally {
				improvements.enabled = true;
			}
		});
	}

	it("should write minified output whatever layout it is asked for", async () => {
		const { minify } = await load();
		const source = "if (a) { b(1, 2), c(3) } else for (;;) d([4, 5]);";
		const { code } = await minify(source, { compress: false, mangle: false });
		const laidOut = await minify(source, {
			compress: false,
			mangle: false,
			format: {
				beautify: true,
				braces: true,
				indent_level: 2,
				indent_start: 4,
				max_line_len: 10,
				width: 10
			}
		});
		expect(laidOut.code).toBe(code);
	});

	/** @type {[string, string, EXPECTED_OBJECT][]} */
	const SCOPE_CASES = [
		["a label defined twice", "a: { a: { sink(1); break a; } }", {}],
		["a name declared twice with let", "let a = 1; let a = 2; sink(a);", {}],
		["a with statement", "with (o) { sink(x); }", {}],
		["eval called in a function", "function f(x) { eval('x'); return x; } sink(f);", {}],
		["arguments read in a function", "function f(a) { return arguments[0] + a; } sink(f);", {}],
		[
			"a parameter default reading a name the body redeclares",
			"var x = 1; function f(a = x, b = a) { var x = 2, a; return x + a + b; } sink(f);",
			{}
		],
		["a switch with block-scoped cases", "switch (x) { case 1: let y = 1; sink(y); break; default: sink(x); }", {}],
		[
			"exports, destructured and default",
			"export var a = 1; export const { b, c: [d] } = o; export function f() { return a; } export default class { m() { return b; } }",
			{ module: true }
		],
		["a default exported function", "export default function f() { return 1; }", { module: true }],
		["a re-export under another name", "export { a as b } from 'c'; export { e as default }; var e = 1;", { module: true }],
		["a block function in sloppy code", "{ function f() { return 1; } } sink(f);", {}],
		["a block function in strict code", "'use strict'; { function f() { return 1; } sink(f); }", {}],
		["a class body, strict of its own", "class A { static x = 1; m() { function g() {} return g; } } sink(A);", {}],
		[
			"a catch parameter redeclaring a parameter",
			"function f(e) { try { sink(e); } catch (e) { var e = 2; sink(e); } return e; } sink(f);",
			{}
		],
		["a function expression named arguments", "var f = function arguments() { return 1; }; sink(f);", {}],
		[
			"catch and loop scopes for old engines",
			"function f(a) { try { sink(a); } catch (a) { sink(a); } for (let i = 0; i < 2; i++) sink(i, a); } sink(f);",
			{ mangle: { ie8: true, safari10: true } }
		],
		["a labelled loop continued", "a: for (;;) { for (;;) { continue a; } }", {}],
		["a parameter default reading an outer name", "var y = 1; function f(a = y) { return a; } sink(f);", {}],
		["a named class expression", "var C = class Named { m() { return Named; } }; sink(C);", {}],
		[
			"top-level catch parameters for old engines",
			"try { sink(1); } catch (e) { sink(e); } try { sink(2); } catch (q) { sink(q); } sink(e);",
			{ mangle: { ie8: true } }
		],
		[
			"a private name a dropped class leaves behind",
			"const self = this; sink(function () { class C { [self.#f] = 1; #f = 2; } });",
			{}
		]
	];

	for (const [name, source, options] of SCOPE_CASES) {
		it(`should analyse scopes as terser does: ${name}`, async () => {
			const { minify, corrections } = await load();
			if (!corrections) throw new Error("the correct phase is not installed");
			const reference = terserReference();
			/**
			 * @param {EXPECTED_ANY} run a minify, webpack's or terser's
			 * @param {EXPECTED_OBJECT} settings its options
			 * @returns {Promise<EXPECTED_ANY>} its result, or the error it threw
			 */
			const outcome = async (run, settings) => {
				try {
					return { code: (await run(source, settings)).code };
				} catch (err) {
					return { error: /** @type {Error} */ (err).message };
				}
			};
			for (const compress of [false, { passes: 2 }]) {
				/** @returns {EXPECTED_OBJECT} the options */
				const settings = () => ({ compress, mangle: true, ...JSON.parse(JSON.stringify(options)) });
				const theirs = await outcome(reference.minify, settings());
				// The correct phase scopes a parameter list apart from its body.
				corrections.enabled = false;
				let ours;
				try {
					ours = await outcome(minify, settings());
				} finally {
					corrections.enabled = true;
				}
				// webpack's parser refuses what the spec makes an early error, in its
				// own words, before any scope is read.
				expect(ours).toEqual(
					theirs.error === undefined ? theirs : { error: expect.any(String) }
				);
			}
		});
	}

	const UNSAFE = {
		unsafe: true,
		unsafe_comps: true,
		unsafe_math: true,
		unsafe_regexp: true,
		unsafe_undefined: true,
		passes: 2
	};
	/** @type {[string, string, import("terser").CompressOptions][]} */
	const COMPRESS_CASES = [
		[
			"tighten: declarations without values lifted out of an `if`'s branches",
			"function f(a) { if (a) { var x; g(x); } else { var y; k(y); } } sink(f);",
			{}
		],
		[
			"tighten: property assignments moved out of a return, the variable kept",
			"function f() { var o = {}; return o.a = 1; } function g() { var o = {}; return (o.a = 1, o.b = 2); } sink(f, g);",
			{"collapse_vars":false}
		],
		[
			"tighten: neighboring `using` declarations joined",
			"async function f() { await using a = x(); await using b = y(); sink(a, b); } function g() { using a = x(); using b = y(); sink(a, b); } sink(f, g);",
			{}
		],
		[
			"tighten: statements after an `else` breaking a label moved into the branch",
			"function f(a) { b: { if (a) { x(); } else { y(); break b; } z(); } } sink(f);",
			{}
		],
		[
			"tighten: an `if` returning nothing at the end of a function, sequences off",
			"function f(a) { x(); if (a) return; } function g(a, b) { x(); if (b) return; y(); if (a) return; } sink(f, g);",
			{"sequences":false}
		],
		[
			"tighten: a property assignment alone in a statement, the variable kept",
			"function g() { var o = {}; o.a = 1, x(); return o; } function h() { var o = {}; o.a = 1; return o; } sink(g, h);",
			{"sequences":false,"collapse_vars":false}
		],
		[
			"tighten: a property assignment in a `for` head, the variable kept",
			"function f() { var o = {}; for (o.a = 1; x(); ) y(); return o; } sink(f);",
			{"collapse_vars":false}
		],
		[
			"tighten: a repeated directive dropped",
			"function f() { \"use strict\"; \"use strict\"; return 1; } sink(f);",
			{}
		],
		[
			"tighten: statements after an exit not moved past a `let`",
			"function f(a) { if (a) { x(); return; } let b = y(); z(b); } sink(f);",
			{}
		],
		[
			"tighten: a function declaration after an exit kept in place",
			"function f(a) { if (a) { x(); return; } y(); function g() { return 2; } sink(g); } sink(f);",
			{}
		],
		[
			"tighten: statements after a labelled break moved into the branch",
			"function f(a) { b: { if (a) { x(); break b; } y(); } z(); } function g(a) { if (a) { x(); } else { y(); return; } z(); } sink(f, g);",
			{}
		],
		[
			"tighten: an `if` returning nothing at the end of a function",
			"function f(a) { x(); if (a) return; } function g(a) { if (a) return; return; } sink(f, g);",
			{}
		],
		[
			"tighten: `if` returns folded into a conditional",
			"function f(a) { if (a) return 1; return 2; } function g(a, b) { if (a) return 1; if (b) return 2; } sink(f, g);",
			{}
		],
		[
			"tighten: a sequence cut at the limit",
			"function f() { a(); b(); c(); d(); e(); g(); h(); } sink(f);",
			{"sequences":3}
		],
		[
			"tighten: an expression moved into a loop head, unless it holds `in`",
			"function f(o, i) { x(\"k\" in o); for (i = 0; i < 2; i++) g(i); } function h(i) { x(); for (i = 0; i < 2; i++) g(i); } function k() { x(); for (;;) { if (y()) break; } } sink(f, h, k);",
			{}
		],
		[
			"tighten: declarations lifted out of an `if`'s branches",
			"function f(a) { if (a) { var x = 1; g(x); } else { var y = 2; g(y); } } sink(f);",
			{}
		],
		[
			"tighten: property assignments moved into the literal just declared",
			"function f() { var o = { a: 1 }; o.a = 2; o.b = 3; return o; } function g() { var o = {}; o[\"1\"] = 1; o[1] = 2; return o; } function h() { \"use strict\"; var o = { a: 1 }; o.b = 2; return o; } sink(f, g, h);",
			{}
		],
		[
			"tighten: property assignments moved out of a return",
			"function f() { var o = {}; return o.a = 1; } function g() { var o = {}; return (o.a = 1, o.b = 2); } function h() { var o = {}; return (o.a = 1, o); } sink(f, g, h);",
			{}
		],
		[
			"tighten: declarations joined into a `for` head",
			"function f() { var o = {}; for (o.a = 1; x(); ) y(); } function g() { var a = 1; for (var i = 0; i < a; i++) y(i); } function h() { var a = 1; for (; a < 3; a++) y(a); } function k() { var a = 1; x(); for (var i; i < a; i++) y(i); } sink(f, g, h, k);",
			{}
		],
		[
			"tighten: property assignments in a statement of their own",
			"function f() { var o = {}; o.a = 1, o.b = 2; return o; } function g() { var o = {}; o.a = 1, x(); return o; } sink(f, g);",
			{}
		],
		[
			"unsafe literals",
			"sink([1, 2, 3].join('-'), ({ a: 1, b: 'x' }).b, [1, [2]].length, ({ a: 1, toString() { return 'o'; } }).a, ({ ...x }).y, ({ a: function () {} }).a, 'abc'.charAt(1), 'abc'[1], [1, 2][1], /a+b/g.source, /a/gi.global, (function f() {}).length, Math.max(1, 2), Math.floor(2.5), String.fromCharCode(65), Number('1'), [1, 2].indexOf(2), ({})[k], Object.keys);",
			UNSAFE
		],
		[
			"every binary operator on constants",
			"sink(1 && 2, 0 || 3, null ?? 4, 1 | 2, 1 & 3, 1 ^ 3, 1 + 2, 3 * 4, 8 / 2, 7 % 3, 5 - 1, 1 << 3, 16 >> 2, -16 >>> 28, 2 ** 3, 1 == '1', 1 != '2', 1 === 1, 1 !== 2, 1 < 2, 1 <= 2, 2 > 1, 2 >= 3, 1n + 2n, NaN == NaN, 'a' + 1, typeof 1, void 0, !0, ~1, -'2', +'3');",
			UNSAFE
		],
		[
			"comparisons negated under unsafe_comps",
			"if (!(a <= b)) sink(1); if (!(a < b)) sink(2); if (!(a >= b)) sink(3); if (!(a > b)) sink(4); if (!(a == b)) sink(5); if (!(a != b)) sink(6); if (!(a === b) && !(c !== d)) sink(7); sink(!(a && b), !(a || b), !(a ? b : c), !(a, b));",
			UNSAFE
		],
		[
			"optional chains and nullish reads",
			"var n = null; sink(n?.a, n?.[k], n?.(), a?.b.c, a?.[b]?.[c], (void 0)?.x); n?.a; n?.[f()]; a?.b; a?.[b()]; x?.y(); (0, a?.b)();",
			{ pure_getters: "strict", passes: 2, unsafe: true }
		],
		[
			"strict getters, classes and constant expressions",
			"var o = { get a() { return 1; } }; o.a; ({ ...o }).b; (class { static x = 1 }).y; (class A extends B { static [k] = f() }); (function () {}).prototype.x; (a = 1).b; (a ||= b).c; (a, b).c; (x ? y : z).w; arguments.length; function g() { return arguments[0]; } sink(g); var C = class { static #p = 1; static m() {} get [k]() {} }; C.m;",
			{ pure_getters: "strict", passes: 3, toplevel: true, reduce_vars: true, unused: true }
		],
		[
			"side effects of every statement kind",
			"function f() { try { a(); } catch (e) { b(); } finally { c(); } switch (x) { case 1: y(); default: z(); } if (a) b(); else c(); l: for (;;) break l; { d(); } return e; } void f; (function () { var u = 1; u++; --u; delete u.x; typeof u; })(); (() => 1)(); new Date(); new Foo(); `a${b}c`; tag`x`; [...[a]]; ({ [k]: v, ...r }); class K { [a()] = 1; static [b()] = 2; static { c(); } #m() {} get #g() {} set #s(v) {} m() {} }",
			{ passes: 2, toplevel: true, side_effects: true, pure_new: true }
		],
		[
			"pure calls and builtins",
			"Math.abs(1); Object.freeze({}); [1, 2].map(x => x); 'a'.toUpperCase(); (1).toFixed(2); /a/.test(s); true.toString(); ({}).hasOwnProperty.call(o, 'k'); Object.prototype.hasOwnProperty.call(o, k); Boolean(x); Number(y); String(z); isNaN(w); parseInt('1'); /*@__PURE__*/ f(); g(); Array.isArray(a); JSON.stringify(b);",
			{ unsafe: true, pure_funcs: ["g"], passes: 2 }
		],
		[
			"builtins pure without unsafe",
			"Math.abs(1); Object.keys(o); Array.from(a); new Map(); new Set([1]); [].concat(a); 'x'.slice(1);",
			{ builtins_pure: true, passes: 2 }
		],
		[
			"conditional and logical effects dropped",
			"a ? b() : c; a ? b : c(); a ? b : c; a && b; a || b(); a ?? b(); (a, b, c); x = x; y += 0; (z = 1).w; for (var i in o); !function () {}(); +function () { f(); }(); void function () {}();",
			{ passes: 2, negate_iife: true, sequences: true }
		],
		[
			"self-referential classes and templates",
			"var A = class A { static x = A.y; }; class B { static [B] = 1; } `${a}${b}`; String.raw`x${y}`; sink(`a${1}b${'c'}d`);",
			{ passes: 2, toplevel: true, unused: true, evaluate: true }
		],
		[
			"regexps and functions evaluated once",
			"var r = /(a|b)*c/; sink(r.source, r.flags, /x/y.sticky, /x/s.dotAll, /x/u.unicode, /x/m.multiline, /x/i.ignoreCase, ('' + function () { return 1; }), [function () {}].length, [0, ...[1, 2]].length);",
			UNSAFE
		],
		[
			"bitwise negation and 32-bit contexts",
			"sink(~~a, ~~(a | 0), ~(~a), ~1, ~-1, ~123456789, a | ~~b, ~(a & b), ~~a >>> 0, (~a) ^ 0, +a | 0, ~a ? 1 : 2);",
			{ passes: 2, unsafe_math: true }
		],
		[
			"an assignment in a dropped sequence head collapsed",
			"function f(g) { var a, x; x = (a = g(), 1); return a + x; } sink(f);",
			{ defaults: false, collapse_vars: true }
		],
		[
			"a collapse scan reaching a for loop's test",
			"function f() { let a = x(); for (; a < 10; ) z(); } sink(f);",
			{}
		],
		[
			"a collapse scan in a try stopping after an expression with effects",
			"function f(b) { try { var a = b.c; x() + q(a); } catch (e) {} } sink(f);",
			{}
		],
		[
			"statements after an if that returns moved into its other branch",
			"function f(a) { if (a) { x(); return; } y(); z(); } function g(a) { if (a) { x(); return void h(); } y(); } function k(a) { if (a) { let q = 1; x(q); return; } y(); } function m(a, b) { var v; if (a) return 1; var w; if (b) return 2; x(); } function n(a) { if (a) x(); else { y(); return; } z(); } function p(a, b) { if (a) return 1; var u; if (b) return; w(); } sink(f, g, k, m, n, p);",
			{ passes: 2 }
		],
		[
			"an if whose branch returns before its end kept",
			"function f(a) { if (a) { x(); return; y(); } z(); } sink(f);",
			{ dead_code: false }
		]
,
		[
			"a variable copying another replaced at every read",
			"function f(x) { var a = x; return a + a; } function g(x) { var a = x; a = 2; return a; } function h(x, y) { var a = x; if (y) return a; return a + 1; } sink(f, g, h);",
			{ defaults: false, collapse_vars: true }
		],
		[
			"a variable copying another replaced at every read, under the defaults",
			"function f(x) { var a = x; return a + a; } function g(x) { var a = x; a = 2; return a; } function h(x, y) { var a = x; if (y) return a; return a + 1; } sink(f, g, h);",
			{}
		],
		[
			"a collapse scan into a switch",
			"function f(x) { var a = g(); switch (x) { case a: return 1; case 2: return a; } } function h() { var a = g(); switch (a) { case 1: return 2; } } function k(x) { var a = g(); switch (x) { default: return 0; case a: return 1; } } sink(f, h, k);",
			{}
		],
		[
			"a collapse into an immediately invoked function's rest parameter and 'this' argument",
			"function f() { return (function (a) { return a; })(this.x); } sink(f, (function (a, ...rest) { return a + rest.length; })(1, 2, 3), (function (a) { return a; })(undefined), (function (a, b) { return a + b; })(1, 2, 3));",
			{}
		],
		[
			"a collapse stopping in a conditional branch",
			"function f(x) { var a = g(); return x ? a : 1; } function h(x) { var a = g(); if (x) return a; return 0; } function k(x) { var a = g(); return x && a; } sink(f, h, k);",
			{}
		],
		[
			"a collapse of an assignment read once, in each place it may stop",
			"function f(x, y) { var a; if ((a = x) && y) return a; return 0; } function g(x) { var a; return (a = x) ? a : 0; } function h(x) { var a; switch (a = x) { case 1: return a; } } function k(x) { var a; for (a = x; a < 10; a++) q(a); } function m(x) { var a; q(a = x, a); } function n(x) { var a; return [a = x, a]; } function p(x) { var a; var b = (a = x, a); return b; } function r(x) { var a; return a = x; } function s(x) { var a; (a = x), q(a); } sink(f, g, h, k, m, n, p, r, s);",
			{}
		],
		[
			"a collapse of an assignment read once, in each place it may stop, alone",
			"function f(x, y) { var a; if ((a = x) && y) return a; return 0; } function g(x) { var a; return (a = x) ? a : 0; } function h(x) { var a; switch (a = x) { case 1: return a; } } function k(x) { var a; for (a = x; a < 10; a++) q(a); } function m(x) { var a; q(a = x, a); } function n(x) { var a; return [a = x, a]; } function p(x) { var a; var b = (a = x, a); return b; } function r(x) { var a; return a = x; } function s(x) { var a; (a = x), q(a); } sink(f, g, h, k, m, n, p, r, s);",
			{ defaults: false, collapse_vars: true }
		]
	];

	for (const [name, source, options] of COMPRESS_CASES) {
		it(`should compress as terser does: ${name}`, async () => {
			const { minify, improvements } = await load();
			const reference = terserReference();
			if (!improvements) throw new Error("the improve phase is not installed");
			/**
			 * @param {EXPECTED_ANY} run a minify, webpack's or terser's
			 * @param {import("terser").MinifyOptions} settings its options
			 * @returns {Promise<{ code: string | undefined } | { error: string }>} its result, or the error it threw
			 */
			const outcome = async (run, settings) => {
				try {
					return { code: (await run(source, settings)).code };
				} catch (err) {
					return { error: /** @type {Error} */ (err).message };
				}
			};
			// terser's bytes are what the compressor ports; `improve` writes less.
			improvements.enabled = false;
			try {
				for (const module of [false, true]) {
					/** @returns {import("terser").MinifyOptions} the options */
					const settings = () => ({
						module,
						mangle: false,
						compress: JSON.parse(JSON.stringify(options))
					});
					expect(
						await uncorrected(() => outcome(minify, settings()))
					).toEqual(
						await outcome(reference.minify, settings())
					);
				}
			} finally {
				improvements.enabled = true;
			}
		});
	}

	/** @type {[string, string, (ast: EXPECTED_ANY) => EXPECTED_ANY][]} */
	const SCOPE_ERROR_CASES = [
		["a scope that is not a program", "function f() {}", (ast) => ast.body[0]],
		[
			"a label defined twice",
			"a: { b: { break b; } }",
			(ast) => {
				const inner = ast.body[0].body.body[0];
				inner.label.name = "a";
				inner.body.body[0].label.name = "a";
				return ast;
			}
		],
		[
			"a break to an undefined label",
			"a: { break a; }",
			(ast) => {
				ast.body[0].body.body[0].label.name = "b";
				return ast;
			}
		],
		[
			"an import below the top level",
			"import x from 'y'; { sink(x); }",
			(ast) => {
				ast.body[1].body.push(ast.body.shift());
				return ast;
			}
		]
	];

	for (const [name, source, reshape] of SCOPE_ERROR_CASES) {
		it(`should refuse a tree as terser does: ${name}`, async () => {
			const { minify, modules } = await load();
			const reference = terserReference();
			/**
			 * @param {EXPECTED_ANY} run a minify, webpack's or terser's
			 * @returns {Promise<string | undefined>} what figuring out scopes threw
			 */
			const refusal = async (run) => {
				// terser's typings leave out `format.ast`, which returns the tree.
				const { ast } = /** @type {EXPECTED_ANY} */ (
					await run(
						source,
						/** @type {EXPECTED_ANY} */ ({
							compress: false,
							mangle: false,
							module: true,
							format: { ast: true, code: false }
						})
					)
				);
				try {
					callNode(modules.ast, reshape(ast), "figure_out_scope", "figureOutScope", {});
				} catch (err) {
					return /** @type {Error} */ (err).message;
				}
			};
			const theirs = await refusal(reference.minify);
			expect(theirs).toEqual(expect.any(String));
			expect(await refusal(minify)).toBe(theirs);
		});
	}

	/** @type {[string, string, Record<string, EXPECTED_ANY>][]} */
	const UNUSED_CASES = [
		["unused off", "function f() { var a = 1; } sink(f);", { compress: { unused: false } }],
		["assignments kept", "function f() { var a; a = g(); } sink(f);", { compress: { unused: "keep_assign" } }],
		["a retained top-level name", "var keep = 1, drop = 2; function gone() {} sink(1);", { toplevel: true, compress: { top_retain: ["keep"] } }],
		["a write-only increment", "function f() { var x = 0; x++; x += 2; } sink(f);", {}],
		["arguments beside destructured parameters", "function f({ a }, b) { return arguments; } sink(f);", {}],
		["a class referring to itself", "var A = class B { static s = B.foo(); }; sink(1);", {}],
		["a class with a side effect", "class C { static s = sink(); } sink(1);", { toplevel: true }],
		["an unused class", "function f() { class A {} class B { static x = sink(); } } sink(f);", {}],
		["assignments to an unused name", "function f() { var a, b; a = g(); (b = 1, c = 2); b = 3; } sink(f);", {}],
		["an unused rest parameter", "function f(a, ...rest) { return a; } sink(f);", { compress: { keep_fargs: false } }],
		["an IIFE's unused parameters", "sink((function (a, b, c) { return a; })(1));", {}],
		["a for head with an unused initializer", "function f() { for (var i = 0, j = g(); i < 1; i++) sink(i); } sink(f);", {}],
		["a labelled for with an unused initializer", "function f() { l: for (var a = g(), b; ;) break l; } sink(f);", {}],
		["a name declared twice", "function f() { var a = 1; var a = g(); return a; } sink(f);", {}],
		["side effects cascaded", "function f() { var a = g(), b = 1, c = h(), d = i(); return b + d; } sink(f);", {}],
		["side effects before a kept name", "function f() { var a = g(), b; return b; } sink(f);", {}],
		["a catch parameter redeclared", "function f() { try { sink(); } catch (e) { var e = g(); } } sink(f);", {}],
		["an unused block-scoped name", "function f() { { let a = g(); const b = 1; } } sink(f);", {}],
		["destructuring with pure getters", "function f() { var {} = o; var [] = p; var { a } = q; } sink(f);", { compress: { pure_getters: true } }],
		["a fixed value reassigned", "function f() { var a = 1; a = 2; return a; } sink(f);", {}],
		["an initializer assigning another name", "function f() { var a = function () { b = 1; }; var b; return a; } sink(f);", {}],
		["a for-in over a declaration", "function f(o) { for (var k in o) sink(); } sink(f);", {}],
		["a named function expression", "sink(function named() { return 1; }, class Named {});", {}],
		["a getter", "sink({ get a() { var unused = 1; return 2; } });", {}],
		["a labelled for left a block", "function f() { l: for (var a = g(), b = 1; b; ) break l; } sink(f);", {}],
		["a fixed value moved to an assignment", "function f() { var a = g(); a = 1; return a; } sink(f);", {}],
		["a name declared twice apart", "function f() { var a = 1; sink(a); var a = g(); return a; } sink(f);", {}],
		["side effects after a kept name", "function f() { var b = x(), a = g(), c = h(); return b + c; } sink(f);", {}],
		["an assignment to an unused name in a nested function", "function f() { var a; sink(function () { a = g(); }); } sink(f);", {}],
		["a fixed value reassigned in a nested getter", "let foo = () => 1; const obj = { get 0() { foo = () => 2; return 40; } }; console.log(obj); var c = obj[0]; console.log(foo(c));", { toplevel: true, compress: { drop_console: true } }],
		["`arguments` in sloppy code", "function f() { return function (a, b) { return arguments[0]; }; } sink(f);", { compress: { keep_fargs: false } }],
		["`arguments` in a strict function", 'function f() { "use strict"; return function (a, b) { return arguments[0]; }; } sink(f);', { compress: { keep_fargs: false } }],
		["`arguments` in its own strict body", 'function f() { return function (a, b) { "use strict"; return arguments[0]; }; } sink(f);', { compress: { keep_fargs: false } }],
		["`arguments` in a class", "class C { m() { return function (a, b) { return arguments[0]; }; } } sink(C);", { compress: { keep_fargs: false } }],
		["`arguments` under an expression arrow", "function f() { return () => [function (a, b) { return arguments[0]; }]; } sink(f);", { compress: { keep_fargs: false } }],
		["`arguments` inherited by an expression arrow", "function f(a, b) { return () => arguments[0]; } sink(f);", { compress: { keep_fargs: false } }],
		["`arguments` in a strict program", '"use strict"; sink(function (a, b) { return arguments[0]; });', { compress: { keep_fargs: false } }]
	];

	// Cases of terser's own suite reaching a branch no case above reaches, under
	// the compress options it gives them.
	/** @type {[string, string, import("terser").CompressOptions][]} */
	const UNUSED_TERSER_CASES = [
		[
			"arguments beside a destructured parameter",
			'(function ({ d }) { console.log(a = "foo", arguments[0].d); })({ d: "Bar" });',
			{ arguments: true, defaults: true }
		],
		[
			"side effects joined into a kept initializer",
			"function f2(x) { var a = 4, b = x.prop, c = 5, not_used = sideeffect1(), e = sideeffect2(); return b + (function () { return -a * e - c; })(); }",
			{ collapse_vars: true, evaluate: true, join_vars: true, reduce_funcs: true, reduce_vars: true, sequences: true, side_effects: true, unused: true }
		],
		[
			"a name declared twice with a value",
			"console.log(function () { var a = 1, b = 2, c = 3; var a = c++, b = b /= a; return function () { return a; }() + b; }());",
			{ collapse_vars: true, unused: true }
		],
		[
			"a labelled for's initializer moved out",
			"!function () { L: for (var a = 1, b = console.log(a); --a;) continue L; }();",
			{ unused: true }
		],
		[
			"a declaration reassigned before it is read",
			"function f2() { var a = {}; a = []; return a; } console.log(f2());",
			{ passes: 2, reduce_vars: true, side_effects: true, unused: true }
		],
		[
			"a fixed name redeclared with a value",
			"function f6(a) { a = {}; var a = []; return a; } console.log(f6());",
			{ passes: 2, reduce_vars: true, side_effects: true, unused: true }
		]
	];

	for (const [name, source, compress] of UNUSED_TERSER_CASES) {
		it(`should drop unused names as terser does: ${name}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			/** @returns {EXPECTED_OBJECT} the options */
			const settings = () => ({
				compress: compress.defaults ? { ...compress } : { defaults: false, ...compress },
				mangle: false
			});
			const ours = await unimproved(() => minify(source, settings()));
			const theirs = await reference.minify(source, settings());
			expect(ours.code).toBe(theirs.code);
		});
	}

	for (const [name, source, options] of UNUSED_CASES) {
		it(`should drop unused names as terser does: ${name}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			for (const base of [{ compress: { passes: 2 }, mangle: true }, { mangle: false }]) {
				/** @returns {EXPECTED_OBJECT} the options */
				const settings = () => {
					const merged = { ...base, ...JSON.parse(JSON.stringify(options)) };
					if (options.compress) {
						merged.compress = { ...(base.compress || {}), ...options.compress };
					}
					return merged;
				};
				const ours = await unimproved(() => minify(source, settings()));
				const theirs = await reference.minify(source, settings());
				expect(ours.code).toBe(theirs.code);
			}
		});
	}

	// Objects `hoist_props` splits or keeps, declared where its check looks and
	// read where only its transform does.
	/** @type {[string, string][]} */
	const HOIST_CASES = [
		["an object read in a nested function", "function f() { var o = { a: 1, b: g() }; return function () { return o.a + o.b; }; } sink(f);"],
		["an object declared in a nested function", "function f() { return function () { var o = { a: 1, b: g() }; return o.a + o.b; }; } sink(f);"],
		["an object with a computed key", "function f() { var o = { [k]: 1, b: g() }; return o.b; } sink(f);"],
		["an object with a spread", "function f() { var o = { ...p, b: g() }; return o.b; } sink(f);"],
		["a value that is not an object", "function f() { var o = g(); return o.a + o.b; } sink(f);"]
	];

	for (const [name, source] of HOIST_CASES) {
		it(`should hoist properties as terser does: ${name}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			for (const options of [{ compress: { passes: 2 }, mangle: true }, { compress: { hoist_props: true }, mangle: false }]) {
				const ours = await unimproved(() => minify(source, options));
				const theirs = await reference.minify(source, options);
				expect(ours.code).toBe(theirs.code);
			}
		});
	}

	// Sources reaching each node class's flow analysis: hoisted functions read
	// before a write, branches, loops, chains and the assignments it tracks.
	/** @type {[string, string, import("terser").CompressOptions?][]} */
	const REDUCE_CASES = [
		["a hoisted function read before a write", "f(); var a = g(); function f() { return a; } sink(f);"],
		[
			"hoisted functions calling each other",
			"b(); var x = g(); function a() { return x; } function b() { return a(); } function c() { return b() + x; } sink(a, b, c);"
		],
		[
			"hoisted functions inside a function",
			"function outer() { k(); var v = h(); function g() { return v; } function k() { return g(); } function unread() { return v; } return k; } sink(outer);"
		],
		[
			"a hoisted function written after it is read",
			"function outer() { var v = h(); function g() { return v; } v = h(); return g; } sink(outer);"
		],
		["a recursive function", "function r(n) { return n && r(n - 1) + x; } var x = g(); sink(r(2));"],
		["a named function expression", "var f = function g(n) { return n ? g(n - 1) : 0; }; sink(f(3));"],
		["an IIFE's parameters", "(function (a, b) { sink(a + b); })(1, 2); (function (a, b) { sink(a, b); })(1);"],
		[
			"an IIFE reading its arguments",
			'(function (a, b) { "use strict"; sink(arguments, a); })(1); (function (a) { sink(arguments, a); })(1); (function (a, a2) { sink(a); })(...g());'
		],
		["optional chains", "var o = g(); sink(o?.a?.(o.b), o?.[k], o.c?.d);"],
		["logical assignments", "var a = g(); a ||= 1; a &&= b(); a ??= c; var d; d ||= 2; sink(a, d);"],
		["compound assignments and steps", "var a = 1; a += 2; a++; --a; var b = g(); b -= 1; sink(a, b);"],
		["a for loop with continue", "for (var i = 0; i < 3; i++) { if (i) continue; sink(i); }"],
		["a do loop with break", "var a = 1; do { if (g()) break; a = 2; } while (a < 3); sink(a);"],
		["a while loop", "var a = g(); while (a) { a = h(a); } sink(a);"],
		["a for-in and a for-of", "var o = g(); for (var k in o) sink(k); for (const v of o) sink(v);"],
		["try, catch and finally", "var a = 1; try { a = g(); } catch (e) { e = 1; sink(e); } finally { sink(a); }"],
		["a switch with a default", "var a = 1; switch (g()) { case a: a = 2; break; default: sink(a); }"],
		["a labelled block", "l: { var a = g(); if (a) break l; sink(a); }"],
		["a class with a static block", "class C { static { var a = 1; sink(a); } m() { return C; } } sink(new C());"],
		[
			"a labelled loop in a static block of a class collapsed past",
			"function f() { var C = class { static { l: for (;;) if (g()) break l; } }; return h(), C; } sink(f);"
		],
		["destructuring", "var { a, b } = g(); [a, b] = [b, a]; sink(a, b);"],
		["conditionals and lazy operators", "var a = g(); var b = a ? 1 : 2; var c = a || b; sink(b, c, a && h());"],
		["values escaping through properties", "var o = { a: { b: 1 } }, p = [o]; sink(o.a.b, o.a, p[0], ...p);"],
		["accessors", "sink({ get a() { var x = 1; return x; }, set a(v) { var y = v; sink(y); } });"],
		["a value modified after it is fixed", "var o = {}; o.x = 1; var a = [1]; a.push(2); sink(o, a);"],
		[
			"generators, async functions and calls",
			"function* gen() { var a = {}; yield a; } async function h() { var b = {}; await b; return b; } var C = function () {}; var o = new C(); sink(gen, h, o);"
		],
		["a top level analysed", "var a = 1; function f() { return a; } f();", { toplevel: true }],
		[
			"a retained top-level function",
			"function f() { return 1; } function g() { return f(); } g();",
			{ toplevel: true, top_retain: ["f"] }
		],
		["without flow analysis", "var a = 1; function f() { return a; } sink(f());", { reduce_vars: false }],
		[
			"a single-use value modified, then read and assigned",
			"function f() { var o = {}; o.p = 1; sink(o); o = 2; return o; } sink(f);"
		],
		["a declared `arguments` read", "function f() { var arguments; return arguments; } sink(f);"],
		["a function name assigned", "function f() { function g() {} g = h(); return g; } sink(f);"],
		["a class expression escaping", "function f() { var C = class {}; sink(C); } sink(f);"],
		["a value yielded from another scope", "var a = {}; function* g() { yield a; } sink(g);"],
		[
			"properties read off a value before it escapes",
			"var o = { a: { b: g() } }, p = { a: { b: {} } }; function h() { return o.a; } function k() { return p.a.b; } sink(h, k);",
			{ toplevel: true }
		],
		[
			"assignments in a function",
			"function f() { var a; a += 1; var b; (b = {}).x = 1; var c = g(); c ||= 1; c &&= h(); var d = 1; d += 2; d++; --d; var e; e++; o.x++; return [a, b, c, d, e]; } sink(f);"
		],
		["an IIFE parameter redeclared", "(function (a) { var a; sink(a); })(1);"],
		[
			"hoisted functions reached twice",
			"function outer() { a(); var x = g(); function a() { return b() + c(); } function b() { return d(); } function c() { return d(); } function d() { return x; } return a; } sink(outer);"
		],
		["a `using` declaration", "function f() { using r = g(); sink(r); } sink(f);"],
		["an arrow declaring `arguments`", "sink(() => { var arguments; return arguments; });"],
		[
			"an assignment after a loop head gave up on it",
			"function f(o) { var a = 1; for (a in o); a = 2; return a; } sink(f);"
		],
		[
			"a function name stepped",
			"function f() { function g() {} g += 1; function k() {} k++; return [g, k]; } sink(f);"
		],
		["a local value yielded", "function* gen() { var a = g(); yield a; } sink(gen);"]
	];

	for (const [name, source, compress] of REDUCE_CASES) {
		it(`should analyse flow as terser does: ${name}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			/** @type {string[]} */
			const outputs = [];
			for (const base of [{ passes: 2 }, {}]) {
				/** @returns {EXPECTED_OBJECT} the options */
				const settings = () => ({
					compress: { ...base, ...compress },
					mangle: Object.keys(base).length !== 0
				});
				const ours = await unimproved(() => minify(source, settings()));
				const theirs = await reference.minify(source, settings());
				expect(ours.code).toBe(theirs.code);
				outputs.push(/** @type {string} */ (ours.code));
			}
			expect(outputs).toMatchSnapshot();
		});
	}

	const INLINE_MAP = Buffer.from(
		JSON.stringify({ version: 3, sources: ["x.js"], names: [], mappings: "AAAA" })
	).toString("base64");

	/** @type {[string, EXPECTED_ANY, EXPECTED_OBJECT][]} */
	const DRIVER_CASES = [
		["timings", "sink(1 + 2);", { timings: true }],
		[
			"a source map written inline",
			{ "a.js": "function f(x) { return x + 1; } sink(f);" },
			{ sourceMap: { url: "inline", filename: "out.js" } }
		],
		[
			"a source map as an object, with a url",
			{ "a.js": "sink(1);" },
			{ sourceMap: { asObject: true, url: "out.js.map", root: "/" } }
		],
		[
			"a source map read from the input",
			`sink(1)\n//# sourceMappingURL=data:application/json;base64,${INLINE_MAP}`,
			{ sourceMap: { content: "inline" } }
		],
		[
			"an input map read from two files",
			{ "a.js": "sink(1);", "b.js": "sink(2);" },
			{ sourceMap: { content: "inline" } }
		],
		["a source without the input map it names", "sink(1);", { sourceMap: { content: "inline" } }],
		["wrapped as a CommonJS module", "exports.a = 1;", { wrap: "lib" }],
		["enclosed", "sink(window);", { enclose: "window:w" }],
		[
			"property mangling with quoted keys and a name cache",
			"var o = { alpha: 1, 'beta': 2 }; sink(o.alpha, o.beta, o['gamma']);",
			{ mangle: { properties: { keep_quoted: true } }, nameCache: {} }
		],
		[
			"property mangling, strictly quoted",
			"var o = { alpha: 1, 'beta': 2 }; sink(o.alpha, o.beta);",
			{ mangle: { properties: { keep_quoted: "strict" } } }
		],
		["a name cache", "function f(longName) { return longName; } sink(f);", { nameCache: { vars: { props: {} } }, toplevel: true }],
		["private members", "class A { #x = 1; get x() { return this.#x; } } sink(A);", {}],
		["private members in files", { "a.js": "class A { #x = 1; m() { return #x in this; } } sink(A);" }, {}],
		["the tree kept", "sink(1);", { format: { ast: true } }],
		["no code", "sink(1);", { format: { code: false } }],
		["ESTree out", "sink(1);", { format: { spidermonkey: true } }],
		[
			"ESTree in",
			{
				type: "Program",
				body: [{ type: "ExpressionStatement", expression: { type: "Literal", value: 1 } }]
			},
			{ parse: { spidermonkey: true } }
		],
		["output and format both", "sink(1);", { output: {}, format: {} }],
		["an unknown option", "sink(1);", { unknown: true }],
		["no source", {}, {}],
		["an array of sources", ["sink(1);", "sink(2);"], {}],
		["mangling off", "function f(longName) { return longName; } sink(f);", { mangle: false }],
		["property mangling on", "var o = { alpha: 1 }; sink(o.alpha);", { mangle: { properties: true } }],
		[
			"property mangling with reserved names kept quoted",
			"var o = { alpha: 1, 'beta': 2 }; sink(o.alpha, o.beta);",
			{ mangle: { properties: { keep_quoted: true, reserved: ["alpha"] } } }
		],
		[
			"ESTree in, from two files",
			{
				"a.js": { type: "Program", body: [{ type: "ExpressionStatement", expression: { type: "Literal", value: 1 } }] },
				"b.js": { type: "Program", body: [{ type: "ExpressionStatement", expression: { type: "Literal", value: 2 } }] }
			},
			{ parse: { spidermonkey: true }, compress: false }
		],
		["names kept as told", "class Long {} function f() {} sink(Long, f);", { keep_classnames: false, keep_fnames: true, rename: false }],
		[
			"a name cache already holding names",
			"function f(longName) { return longName; } sink(f);",
			{ nameCache: { vars: { props: { $f: "q" } } }, toplevel: true }
		],
		["a name cache without a mangle cache", "sink(1);", { nameCache: {}, mangle: { cache: null } }],
		["an inline source map as an object", "sink(1);", { sourceMap: { url: "inline", asObject: true } }],
		[
			"ESTree in, as an array",
			[
				{ type: "Program", body: [{ type: "ExpressionStatement", expression: { type: "Literal", value: 1 } }] },
				{ type: "Program", body: [{ type: "ExpressionStatement", expression: { type: "Literal", value: 2 } }] }
			],
			{ parse: { spidermonkey: true }, compress: false }
		]
	];

	for (const [name, files, options] of DRIVER_CASES) {
		it(`should drive a minify as terser does: ${name}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			/**
			 * @param {EXPECTED_ANY} run a minify, webpack's or terser's
			 * @returns {Promise<EXPECTED_ANY>} what it wrote, or the error it threw
			 */
			const outcome = async (run) => {
				const settings = JSON.parse(JSON.stringify(options));
				try {
					/** @type {EXPECTED_ANY} */
					const result = await run(JSON.parse(JSON.stringify(files)), settings);
					return {
						code: result.code,
						map: result.map,
						decoded: result.decoded_map,
						ast: result.ast === undefined ? undefined : typeof result.ast,
						timings: result.timings && Object.keys(result.timings),
						nameCache: settings.nameCache && JSON.stringify(settings.nameCache)
					};
				} catch (err) {
					return { error: thrownMessage(err) };
				}
			};
			expect(await unimproved(() => outcome(minify))).toEqual(
				await outcome(reference.minify)
			);
		});
	}

	for (const name of ["expression", "experimental_typescript", "strict"]) {
		it(`should refuse terser's \`${name}\` parse option`, async () => {
			const { minify } = await load();
			await expect(
				minify("a + b", /** @type {EXPECTED_ANY} */ ({ parse: { [name]: true } }))
			).rejects.toThrow(`\`${name}\` is not a supported option`);
		});
	}

	it("should drive a minify as terser does: sources inherited by the files object", async () => {
		const { minify } = await load();
		const reference = terserReference();
		/** @returns {Record<string, string>} own and inherited sources */
		const files = () =>
			Object.assign(Object.create({ "inherited.js": "sink(0);" }), {
				"a.js": "sink(1);",
				"b.js": "sink(2);"
			});
		const { code } = await minify(files(), {});
		expect(code).toBe((await reference.minify(files(), {})).code);
		expect(code).toMatchSnapshot();
	});

	it("should drive a minify as terser does: a tree with its sources asked for", async () => {
		const { minify } = await load();
		const reference = terserReference();
		/**
		 * @param {EXPECTED_ANY} run a minify, webpack's or terser's
		 * @returns {Promise<string | undefined>} what the second minify threw
		 */
		const refusal = async (run) => {
			// terser's typings leave out `format.ast`, which returns the tree.
			const { ast } = /** @type {EXPECTED_ANY} */ (
				await run("sink(1);", /** @type {EXPECTED_ANY} */ ({ format: { ast: true } }))
			);
			try {
				await run(ast, { sourceMap: { includeSources: true } });
			} catch (err) {
				return /** @type {Error} */ (err).message;
			}
		};
		const theirs = await refusal(reference.minify);
		expect(theirs).toEqual(expect.any(String));
		expect(await refusal(minify)).toBe(theirs);
	});

	it("should drive a minify as terser does: a tree handed back with a private member", async () => {
		const { minify } = await load();
		const reference = terserReference();
		/**
		 * @param {EXPECTED_ANY} run a minify, webpack's or terser's
		 * @returns {Promise<string | undefined>} a returned tree, given a private member, minified again
		 */
		const handedBack = async (run) => {
			const settings = /** @type {EXPECTED_ANY} */ ({
				compress: false,
				mangle: false,
				format: { ast: true }
			});
			const { ast } = /** @type {EXPECTED_ANY} */ (await run("sink(1);", settings));
			const { ast: other } = /** @type {EXPECTED_ANY} */ (
				await run("class A { #x = 1; m() { return this.#x; } } sink(A);", settings)
			);
			ast.body = other.body;
			return (await run(ast, {})).code;
		};
		const code = await handedBack(minify);
		expect(code).toBe(await handedBack(reference.minify));
		expect(code).toMatchSnapshot();
	});

	it("should drop unused names as terser does: sequences emptied in a tree", async () => {
		const { minify } = await load();
		const reference = terserReference();
		/**
		 * @param {EXPECTED_ANY} run a minify, webpack's or terser's
		 * @returns {Promise<string | undefined>} the tree minified with its sequences emptied
		 */
		const emptied = async (run) => {
			const { ast } = /** @type {EXPECTED_ANY} */ (
				await run(
					"function f(a) { sink(a, (a, a)); a, a; } sink(f);",
					/** @type {EXPECTED_ANY} */ ({ compress: false, mangle: false, format: { ast: true } })
				)
			);
			const fn = ast.body[0];
			// terser's names are `body` and `args`, webpack's ESTree's `expression`
			// and `arguments`; webpack's function holds its statements in a block.
			const body = Array.isArray(fn.body) ? fn.body : fn.body.body;
			const call = body[0].expression || body[0].body;
			(call.arguments || call.args)[1].expressions = [];
			(body[1].expression || body[1].body).expressions = [];
			return (
				await run(ast, { compress: { defaults: false, unused: true }, mangle: false })
			).code;
		};
		const code = await emptied(minify);
		expect(code).toBe(await emptied(reference.minify));
		expect(code).toMatchSnapshot();
	});

	it("should drop unused names as terser does: a scope without its variables", async () => {
		const { minify, modules } = await load();
		const reference = terserReference();
		const compressor = { option: () => true, has_directive: () => undefined };
		/**
		 * @param {EXPECTED_ANY} run a minify, webpack's or terser's
		 * @returns {Promise<EXPECTED_ANY>} what dropping unused names in the class returned
		 */
		const dropped = async (run) => {
			const { ast } = /** @type {EXPECTED_ANY} */ (
				await run(
					"class A {}",
					/** @type {EXPECTED_ANY} */ ({ compress: false, mangle: false, format: { ast: true } })
				)
			);
			const node = ast.body[0];
			node.variables = undefined;
			return callNode(modules.ast, node, "drop_unused", "dropUnused", compressor);
		};
		expect(await dropped(minify)).toBe(await dropped(reference.minify));
	});

	it("should write terser's debug log as terser does", async () => {
		const { minify } = await load();
		const reference = terserReference();
		/**
		 * @param {EXPECTED_FUNCTION} run a minify
		 * @param {EXPECTED_ANY} files the sources
		 * @param {EXPECTED_OBJECT} options the options
		 * @returns {Promise<{ code?: string, logs: string[][] }>} the result, and each file written with its name
		 */
		const logged = async (run, files, options) => {
			/** @type {string[][]} */
			const logs = [];
			const fs = {
				writeFileSync: (/** @type {string} */ file, /** @type {string} */ text) =>
					logs.push([file, text]),
				mkdirSync() {
					throw Object.assign(new Error("exists"), { code: "EEXIST" });
				}
			};
			const previous = process.env.TERSER_DEBUG_DIR;
			process.env.TERSER_DEBUG_DIR = "debug";
			try {
				const { code } = await run(files, options, fs);
				return { code, logs };
			} finally {
				if (previous === undefined) delete process.env.TERSER_DEBUG_DIR;
				else process.env.TERSER_DEBUG_DIR = previous;
			}
		};
		// Built per run: both minifiers write into the option groups they are given.
		/** @type {[EXPECTED_ANY, () => EXPECTED_OBJECT][]} */
		const inputs = [
			["sink(1 + 2);", () => ({ compress: { pure_funcs: ["f"] } })],
			[
				{ "a.js": "sink(1);", "b.js": "sink(2);" },
				() => ({ mangle: { reserved: ["x"] } })
			],
			[
				{ type: "Program", body: [] },
				() => ({ parse: { spidermonkey: true }, format: { comments: /^!/ } })
			]
		];
		for (const [files, options] of inputs) {
			const ours = await logged(minify, files, options());
			const theirs = await logged(reference.minify, files, options());
			expect(ours.code).toBe(theirs.code);
			expect(ours.logs).toHaveLength(1);
			expect(ours.logs[0][0]).toMatch(/^debug\/terser-debug-\d+\.log$/);
			expect(ours.logs[0][1]).toBe(theirs.logs[0][1]);
		}

		const failing = {
			writeFileSync() {},
			mkdirSync() {
				throw Object.assign(new Error("denied"), { code: "EACCES" });
			}
		};
		process.env.TERSER_DEBUG_DIR = "debug";
		try {
			await expect(
				/** @type {EXPECTED_FUNCTION} */ (minify)("a", {}, failing)
			).rejects.toThrow("denied");
			const result = await /** @type {EXPECTED_FUNCTION} */ (minify)("a", {}, {});
			expect(result.code).toBe("a;");
		} finally {
			delete process.env.TERSER_DEBUG_DIR;
		}
	});

	/** @type {[string, EXPECTED_ANY, EXPECTED_OBJECT][]} */
	const PARSED_BY_TERSER = [
		["sources embedded in the map", "sink(1)", { sourceMap: { includeSources: true } }],
		[
			"an inline input map",
			`sink(1)\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(
				JSON.stringify({ version: 3, sources: ["x.js"], names: [], mappings: "AAAA" })
			).toString("base64")}`,
			{ sourceMap: { content: "inline" } }
		],
		["a tree printed as ESTree", "sink(1)", { format: { spidermonkey: true } }],
		["a shebang terser is told to refuse", "#!/bin/node\nsink(1)", { parse: { shebang: false } }],
		["two files", { "a.js": "sink(1)", "b.js": "sink(2)" }, {}],
		["an array of sources", ["sink(1)", "sink(2)"], {}],
		["a file that is not text", { "a.js": 1 }, {}],
		["a shebang ended by a carriage return", "#!/bin/node\r{}", {}],
		["a shebang ended by a line separator", "#!/bin/node\u2028{}", {}],
		["a shebang ended by a paragraph separator", "#!/bin/node\u2029{}", {}],
		["a source webpack's parser refuses", "sink(", {}],
		["a private field with no class around it", "sink(foo.#bar);", {}],
		["a private field tested with no class around it", "sink(#foo in bar);", {}],
		["a source terser reads its own way", "x = 0123;", {}],
		["a module", "export const a = 1; import b from 'c'; sink(b);", { module: true }],
		["a module named by the parse options", "export const a = 1;", { parse: { module: true } }],
		["a module whose parse options are unset", "await x;", { module: true, parse: undefined }],
		["a module whose parse options are not an object", "await x;", { module: true, parse: true }],
		["a module the parse options say is not one", "await x;", { module: true, parse: { module: false } }],
		["a return outside a function", "return 1;", { parse: { bare_returns: true } }],
		["a string rather than files", "sink(1)", {}]
	];

	for (const [name, files, options] of PARSED_BY_TERSER) {
		it(`should minify as terser does where terser parses: ${name}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			/**
			 * @param {EXPECTED_ANY} run a minify, webpack's or terser's
			 * @returns {Promise<EXPECTED_ANY>} its result, or the error it threw
			 */
			const outcome = async (run) => {
				try {
					const result = await run(JSON.parse(JSON.stringify(files)), {
						...options,
						compress: false
					});
					return { code: result.code, map: result.map };
				} catch (err) {
					return { error: thrownMessage(err) };
				}
			};
			const theirs = await outcome(reference.minify);
			// The two parsers word a refusal each their own way.
			expect(await outcome(minify)).toEqual(
				theirs.error === undefined ? theirs : { error: expect.any(String) }
			);
		});
	}

	// Layouts where a comment decides where a line break or a brace is printed,
	// which terser's tokenizer, its parentheses and its sequences each decide.
	/** @type {[string, string][]} */
	const COMMENT_PLACEMENT_CASES = [
		[
			"a banner comment before a parenthesized call",
			"/*!\n * banner\n */\n(function (w) { w.x = 1; })(this);"
		],
		[
			"a banner comment read after an operator",
			"!/*!\n * banner\n */\nfunction (g) { g.x = 1; }(this);"
		],
		[
			"a comment of a parenthesis, on the line before it",
			"var a = 1;/*! keep */\n(function () { a++; })();"
		],
		[
			"two comments of a parenthesis, on the line before it",
			"var a = 1;/*! one */ /*! two */\n(function () { a++; })();"
		],
		[
			"a comment on the line its parenthesis opens",
			"/*! a */(function () {})();"
		],
		[
			"a comment inside a parenthesis holding none of its own",
			"sink((/*! a */ function () {})());"
		],
		[
			"a bigint written with separators and each radix",
			"sink(0x20n, 123_456_789n, 0b1010n, 1_000n, 0o17n, 9_007_199_254_740_993n);"
		],
		[
			"a comment whose line breaks are carriage returns",
			"/*!\r\n * banner\r\n */\r\n(function (w) { w.x = 1; })(this);\r\n"
		],
		[
			"a comment broken by a line separator",
			"/*!\u2028 * banner\u2029 */\n(function (w) { w.x = 1; })(this);"
		],
		[
			"a comment after a function returning a sequence",
			"function q(t) { return f(t), new d(t); }\n/*! keep */\nsink(q);"
		],
		[
			"a comment after a function returning a parenthesized sequence",
			"function q(t) { return (f(t), new d(t)); }\n/*! keep */\nsink(q);"
		],
		[
			"a comment after a sequence of its own",
			"D.A = new D(1), D.B = new D(2);\n/*! keep */\nsink(D);"
		],
		["a sequence ending the source", "/*! keep */\nsink(a), sink(b)"]
	];
	for (const [name, source] of COMMENT_PLACEMENT_CASES) {
		it(`should print a comment where terser does: ${name}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			const options = { compress: false, mangle: false };
			const ours = await minify(source, { ...options });
			const theirs = await reference.minify(source, { ...options });
			expect(ours.code).toBe(theirs.code);
		});
	}

	// `wrap` and `enclose` are options terser reads but its types omit.
	/** @type {[string, string, EXPECTED_OBJECT][]} */
	const DEFINE_CASES = [
		[
			"globals replaced by source `global_defs` names with `@`",
			"sink(VALUE, CALL(1), SEQUENCE);",
			{
				compress: {
					global_defs: {
						"@VALUE": "a + b // the rest of the line",
						"@CALL": "function (x) { return x * 2; }",
						"@SEQUENCE": "a, b"
					}
				}
			}
		],
		[
			"globals replaced by what `global_defs` gives them",
			"if (DEBUG) console.log(FOO.bar, import.meta.env, O?.x, FOO.bar.baz); FOO.bar = 1; function g(DEBUG) { return DEBUG; } console.log(g(2));",
			{
				module: true,
				compress: {
					global_defs: {
						DEBUG: false,
						"FOO.bar": [1, { a: 2 }],
						"import.meta.env": 3,
						O: { x: "y" }
					}
				}
			}
		],
		[
			"every `console` call dropped",
			"console.log(1); var f = console.log.bind(console); console.log.call(console, 2); console.a.b.c(); x = console.warn.apply(console, []); f();",
			{ compress: { drop_console: true } }
		],
		[
			"only the `console` methods named dropped",
			"console.log(1); console.warn(2); var f = console.log.bind(console); f();",
			{ compress: { drop_console: ["log"] } }
		],
		["a module wrapped as CommonJS", "var x = 1; exports.x = x;", { wrap: "lib" }],
		[
			"a script enclosed in a call",
			"console.log(a, b);",
			{ enclose: "a,b:1,2", compress: false }
		],
		["a script enclosed without arguments", "console.log(1);", { enclose: true }],
		[
			"parameters and declarations destructured",
			"function f({ a }, [b], ...c) { return a + b + c.length; } function g(d = 1, { e } = {}) { var { h, i: [j] } = e; return d + h + j; } console.log(f({ a: 1 }, [2], 3), g(), f.length, g.length);",
			{ compress: { passes: 2, unsafe: true }, mangle: false }
		],
		[
			"a labeled loop inlined twice",
			"function f(n) { l: for (var i = 0; i < n; i++) { if (i > 2) break l; } return i; } console.log(f(5), f(1));",
			{ compress: { passes: 3, inline: 3, reduce_funcs: false }, mangle: false }
		],
		[
			"a call of an annotated call",
			"var r = /* @__PURE__ */ ((x) => y.z)(function (x) {})(E || {}); sink(r);",
			{ compress: { passes: 2 }, mangle: false }
		],
		[
			"a class reading itself as it is defined",
			"class A { static x = A.name; static [Symbol.iterator] = 1; static { this.y = 1; } m() {} } class B { static x = this; } class C extends Object { static z = function () { return this; }; }",
			{ module: true, compress: { toplevel: true, unused: true } }
		]
	];
	for (const [name, source, options] of DEFINE_CASES) {
		it(`should minify as terser does: ${name}`, async () => {
			const { minify } = await load();
			const reference = terserReference();
			const ours = await unimproved(() =>
				minify(
					source,
					/** @type {import("terser").MinifyOptions} */ ({ ...options })
				)
			);
			const theirs = await reference.minify(
				source,
				/** @type {import("terser").MinifyOptions} */ ({ ...options })
			);
			expect(ours.code).toBe(theirs.code);
		});
	}

	it("should give a global the copy of a node `global_defs` gives it", async () => {
		const {
			minify,
			modules: { parse }
		} = await load();
		const value = parse.parse("(function () { return 1 + x; })").body[0]
			.expression;
		const { code } = await minify("console.log(A, A, B);", {
			compress: {
				global_defs: { A: value, B: parse.parse("2").body[0].expression },
				passes: 1,
				reduce_vars: false,
				unused: false
			},
			mangle: false
		});
		expect(code).toBe(
			"console.log(function(){return 1+x},function(){return 1+x},2);"
		);
	});

	it("should refuse a `global_defs` source that is not one expression", async () => {
		const { minify } = await load();
		await expect(
			minify("sink(A);", { compress: { global_defs: { "@A": "1); (2" } } })
		).rejects.toThrow("`@A` is not one expression");
	});

	it("should map a `global_defs` source to itself, not to the file's tokens", async () => {
		const { minify } = await load();
		const { code, map } = await minify(
			"var x = 1;\nfunction f() { return CONF; }\nexport { f };",
			{
				compress: { global_defs: { "@CONF": "cfg.value" } },
				mangle: false,
				module: true,
				sourceMap: { asObject: true }
			}
		);
		expect(code).toMatchSnapshot();
		// `x` is never printed, so naming it means `CONF` read the file's tokens.
		expect(/** @type {{ names: string[] }} */ (map).names).toEqual(["f"]);
	});

	it("should read a `new Function` body's tokens from its own source", async () => {
		const { minify } = await load();
		const { code } = await minify("new Function('a', 'b', 'console.log(a, b)')", {
			compress: { passes: 2, unsafe: true, unsafe_Function: true }
		});
		expect(code).toMatchSnapshot();
	});

	it("should print a call's comments to a `pure_funcs` function", async () => {
		const { minify } = await load();
		/** @type {string[]} */
		const printed = [];
		await minify("/*a*/ foo(/*b*/ x, 2 /*c*/);", {
			compress: {
				pure_funcs: (
					/** @type {{ print_to_string: (options: { comments: boolean }) => string }} */ node
				) => {
					printed.push(node.print_to_string({ comments: true }));
					return true;
				}
			},
			mangle: false
		});
		expect(printed[0]).toMatchSnapshot();
	});

	it("should keep a wrapped file's comments and mappings", async () => {
		const { minify } = await load();
		const { code, map } = await minify(
			"/* lead */ var alpha = 1;\nbeta(alpha);",
			/** @type {import("terser").MinifyOptions & { wrap: string }} */ ({
				wrap: "Lib",
				compress: false,
				mangle: false,
				format: { comments: "all" },
				sourceMap: { asObject: true }
			})
		);
		expect(code).toMatchSnapshot();
		expect(/** @type {{ names: string[] }} */ (map).names).toEqual(["alpha", "beta"]);
	});

	it("should compress what the compressor's scopes decide as terser does", async () => {
		const { minify } = await load();
		/** @type {[string, EXPECTED_OBJECT, string][]} */
		const cases = [
			[
				"var o = { a: 1, b: 2 }, o_a = 3; f(o.a, o.b, o_a);",
				{ toplevel: true, compress: { hoist_props: true, passes: 2 } },
				"f(1,2,3);"
			],
			[
				"function g() { function f(n) { return n ? f(n - 1) : 0; } return f(3); } h(g);",
				{},
				"function g(){return function n(r){return r?n(r-1):0}(3)}h(g);"
			],
			[
				"function f() { var s = this; return s.a + s.b; } g(f);",
				{},
				"function f(){return this.a+this.b}g(f);"
			],
			[
				"function f() { var x; function h() { return x; } g(h); return x = 2; } k(f);",
				{},
				"function f(){var n;return g(function(){return n}),n=2}k(f);"
			],
			[
				"function f(a) { \"use strict\"; var a; return arguments[0]; } g(f);",
				{ compress: { arguments: true } },
				"function f(t){\"use strict\";return arguments[0]}g(f);"
			],
			[
				"function f() { return arguments[1]; } g(f);",
				{ compress: { arguments: true, keep_fargs: false } },
				"function f(f,n){return n}g(f);"
			],
			[
				"function f(a) { var a; return arguments[0]; } g(f);",
				{ compress: { arguments: true } },
				"function f(f){return arguments[0]}g(f);"
			],
			[
				"try { x(); } catch (e) { y(void 0); }",
				{ compress: { unsafe_undefined: true } },
				"try{x()}catch(c){y(void 0)}"
			],
			[
				"function q() { for (var i = 0; i < 3; i++) /*@__INLINE__*/ (function () { var a = h(i); k(a, a); })(); } g(q);",
				{ compress: { inline: 3 } },
				"function q(){for(var o=0;o<3;o++)r=void 0,r=h(o),k(r,r);var r}g(q);"
			],
			[
				"var a = () => function () { return 1; }; function f() { return a(); } g(f);",
				{ toplevel: true },
				"g(function(){return function(){return 1}});"
			],
			[
				"(function f(a) { return 1; })(2);",
				{ compress: { keep_fnames: true } },
				""
			],
			[
				"(function f(a) { g(); })(2);",
				{ compress: { keep_fnames: true } },
				"!function n(){g()}();"
			],
			[
				"function arguments() {} console.log(typeof arguments);",
				{ toplevel: true },
				'console.log("function");'
			],
			[
				"var f = function arguments() { return typeof arguments; }; console.log(f());",
				{ toplevel: true },
				"console.log(function(){return typeof arguments}());"
			]
		];
		for (const [source, options, expected] of cases) {
			expect((await minify(source, options)).code).toBe(expected);
		}
	});

	it("should keep the compressor's scopes as terser's scope methods do", async () => {
		const { ast, parse } = (await load()).modules;
		/**
		 * @param {string} source a script
		 * @returns {EXPECTED_ANY} its toplevel, its scopes worked out
		 */
		const parsed = (source) => {
			const toplevel = parse.parse(source);
			ast.figureOutScope(toplevel, {});
			return toplevel;
		};

		// A copy of a scope past the size it indexes at takes its own index.
		const wide = parsed("function f(a, b, c, d, e, g, h, i, j) {}").body[0];
		const copy = ast.cloneNode(wide, false);
		expect(copy.block_scope._index).not.toBe(wide.block_scope._index);
		expect(copy.block_scope.getBinding("j")).toBe(wide.block_scope.getBinding("j"));

		// Declared again, a name joins its definition, whose value a function's
		// own name or a declaration in another scope replaces.
		const toplevel = parsed("function f() {} var v; (function g() { var w = 1; });");
		const scope = toplevel.block_scope;
		const defun = scope.getBinding("f");
		const again = ast.SymbolVarNode({ name: "f", scope });
		expect(ast.defineVariable(scope, again, null)).toBe(defun);
		expect(defun.identifiers).toEqual([toplevel.body[0].id, again]);
		expect(defun.init).toBe(toplevel.body[0]);
		ast.defineVariable(scope, ast.SymbolVarNode({ name: "f", scope: null }), null);
		expect(defun.init).toBe(null);
		ast.defineVariable(scope, ast.SymbolVarNode({ name: "v", scope }), toplevel);
		expect(scope.getBinding("v").init).toBe(null);
		const lambda = toplevel.body[2].expression;
		const lambdaScope = lambda.block_scope;
		ast.defineVariable(lambdaScope, ast.SymbolVarNode({ name: "g", scope: lambdaScope }), null);
		expect(lambdaScope.getBinding("g").init).toBe(null);
		expect(ast.defineFunction(lambdaScope, ast.SymbolLambdaNode({ name: "g", scope: lambdaScope }), lambda).init).toBe(lambda);

		// An arrow moved into a function reads that function's `arguments`.
		const moved = parsed("function f() { return 1; } var a = () => arguments, b = () => () => function () { return arguments; };");
		const [into] = moved.body;
		ast.addChildScope(into.block_scope, moved.body[1].declarations[1].init);
		expect(into.block_scope.usesArguments).toBe(false);
		ast.addChildScope(into.block_scope, moved.body[1].declarations[0].init);
		expect(into.block_scope.usesArguments).toBe(true);
		expect(moved.body[1].declarations[0].init.block_scope.upper).toBe(into.block_scope);

		// Moved in, a function's reads of the scopes around it are theirs too.
		const reads = parsed("var a, b, c, d; function f() {} var g = function () { return a + b + z; };");
		const target = reads.body[1].block_scope;
		ast.addChildScope(target, reads.body[2].declarations[0].init);
		expect(target.enclosed.map((/** @type {EXPECTED_ANY} */ definition) => definition.name)).toEqual(["a", "b"]);
	});

	it("should give terser's nodes the methods terser writes by hand", async () => {
		const { ast, parse } = (await load()).modules;
		const { createWalker } = ast;
		/**
		 * @param {string} source a script
		 * @returns {EXPECTED_ANY} its toplevel, its scopes worked out
		 */
		const parsed = (source) => {
			const toplevel = parse.parse(source);
			ast.figureOutScope(toplevel, {});
			return toplevel;
		};

		const labeled = parsed("l: for (;;) { { let x; } break l; }").body[0];
		const copy = ast.cloneNode(labeled, true);
		expect(copy).not.toBe(labeled);
		expect(copy.label.references).toHaveLength(1);
		expect(ast.cloneNode(labeled, false).body).toBe(labeled.body);

		// A deep copy holds no list of the original's, an empty one included.
		const lists = parsed("function f() { g(a); }").body[0];
		const deep = ast.cloneNode(lists, true);
		expect(deep.params).not.toBe(lists.params);
		expect(deep.body.body).not.toBe(lists.body.body);
		const call = lists.body.body[0].expression;
		expect(deep.body.body[0].expression.arguments).not.toBe(call.arguments);

		const toplevel = parsed("function f(a) { return a; }");
		const declared = toplevel.body[0];
		const cloned = ast.cloneNode(declared, true, toplevel);
		expect(cloned.block_scope.variables).not.toBe(declared.block_scope.variables);
		const shallow = ast.cloneNode(declared, false);
		expect(shallow.block_scope).not.toBe(declared.block_scope);
		expect(shallow.block_scope.variables).not.toBe(declared.block_scope.variables);
		expect(shallow.block_scope.getBinding("a")).toBe(declared.block_scope.getBinding("a"));
		expect(declared.block_scope.getDefunScope()).toBe(declared.block_scope);
		expect(ast.isPinned(declared)).toBe(false);

		const lambda = parsed("function f({ a }, [b], ...c) {} function g(d = 1, e) { return d; } function h(p, q) {}").body;
		expect(ast.argsAsNames(lambda[2])).toBe(lambda[2].params);
		expect(ast.allSymbols(lambda[1].params[0]).map((/** @type {EXPECTED_ANY} */ n) => n.name)).toEqual(["d"]);
		expect(ast.argsAsNames(lambda[0]).map((/** @type {EXPECTED_ANY} */ n) => n.name)).toEqual(["a", "b", "c"]);
		expect(ast.argsAsNames(lambda[1]).map((/** @type {EXPECTED_ANY} */ n) => n.name)).toEqual(["d", "e"]);
		expect(ast.lengthProperty(lambda[0])).toBe(2);
		expect(ast.isBraceless(lambda[1])).toBeTruthy();
		expect(ast.isBraceless(lambda[0])).toBeFalsy();
		const declarations = parsed("var { h, i: [j] } = o, k;").body[0].declarations;
		expect(ast.declarationsAsNames(declarations[0]).map((/** @type {EXPECTED_ANY} */ n) => n.name)).toEqual(["h", "j"]);
		expect(ast.declarationsAsNames(declarations[1]).map((/** @type {EXPECTED_ANY} */ n) => n.name)).toEqual(["k"]);

		const object = parsed("({ a: 1, [b]: 2, get c() {}, set [d](v) {}, e() {} })").body[0].expression;
		expect(object.properties.map((/** @type {EXPECTED_ANY} */ p) => p.computed)).toEqual([false, true, false, true, false]);
		const declaredClass = parsed(
			"class K extends L { #p = 1; static q = this; r = 2; static { s(); } #t() {} get #u() {} set #u(v) {} static [w] = 3; x() {} }"
		).body[0];
		// A static block has no key, so nothing says whether it is computed.
		expect(declaredClass.body.body.map((/** @type {EXPECTED_ANY} */ p) => Boolean(p.computed))).toEqual([
			false, false, false, false, false, false, false, true, false
		]);
		/**
		 * @param {string} method the function of `ast` walking parts of a class
		 * @returns {string[]} the types of the nodes it visits
		 */
		const visits = (method) => {
			/** @type {string[]} */
			const types = [];
			ast[method](
				declaredClass,
				createWalker((/** @type {EXPECTED_ANY} */ node) => {
					types.push(kindName(node));
				})
			);
			return types;
		};
		expect(visits("visitNondeferredClassParts")).toEqual([
			"SymbolRef", "This", "ClassStaticBlock", "SimpleStatement", "CallExpression", "SymbolRef", "SymbolRef", "Number"
		]);
		// A field's value is walked with the field pushed, not visited.
		expect(visits("visitDeferredClassParts")).toEqual([
			"Number", "Number", "PrivateMethod", "SymbolMethod", "Accessor", "ClassMethod", "SymbolMethod", "Accessor"
		]);

		/** @type {Record<string, unknown>} */
		const seen = {};
		const walked = parsed(
			'"use strict"; function f() { a: for (var i in o) { switch (i) { case 1: break; default: continue a; } } while (1) { for (let j = g(); j; ) { break; } } }'
		);
		ast.walkNode(walked, createWalker(
				/**
				 * @this {EXPECTED_ANY} the walker
				 * @param {EXPECTED_ANY} node the node visited
				 * @returns {void}
				 */
				function visit(node) {
				if (kindName(node) === "Break" || kindName(node) === "Continue") {
					const target = this.loopcontrol_target(node);
					const key = `${kindName(node)}${node.label ? " label" : ""}`;
					seen[key] = [...(/** @type {string[]} */ (seen[key]) || []), kindName(target)];
				}
				if (kindName(node) === "CallExpression") {
					seen.withinLoop = this.is_within_loop();
					const scope = this.find_scope();
					seen.scope = `${scope.type} ${kindName(scope.node)}`;
					seen.parent = kindName(this.parent());
					seen.self = kindName(this.self());
					seen.lambda = kindName(this.find_parent(ast.isLambdaNode));
					seen.strict = Boolean(this.has_directive("use strict"));
				}
				if (kindName(node) === "SymbolRef" && node.name === "o") {
					seen.objectWithinLoop = this.is_within_loop();
				}
				if (kindName(node) === "Toplevel") {
					seen.toplevelStrict = Boolean(this.has_directive("use strict"));
					seen.toplevelAsm = this.has_directive("use asm");
				}
				}
			)
		);
		expect(seen).toEqual({
			toplevelStrict: true,
			toplevelAsm: undefined,
			objectWithinLoop: false,
			Break: ["Switch", "For"],
			"Continue label": ["ForIn"],
			withinLoop: true,
			scope: "for For",
			parent: "VarDef",
			self: "CallExpression",
			lambda: "Defun",
			strict: true
		});
	});

	it("should name a predicate per node class answering on the node's data", async () => {
		const { ast } = (await load()).modules;
		const { NODE_KIND_ANCESTRY } = require("../../lib/javascript/syntax-printer");
		/**
		 * @param {string} name a kind
		 * @returns {string[]} it and the kinds it is one of
		 */
		const ancestry = (name) => NODE_KIND_ANCESTRY[name];
		const method = (/** @type {string | undefined} */ type = undefined) =>
			ast.SymbolMethodNode({ name: "m", type });
		// What tells each kind apart from the others of its type, where its own
		// values do not.
		/** @type {Record<string, () => EXPECTED_OBJECT>} */
		const props = {
			Directive: () => ({ directive: "use strict" }),
			Case: () => ({ test: ast.NumberNode({ value: 1 }) }),
			Dot: () => ({ property: ast.SymbolPropertyNode({ name: "p" }) }),
			DotHash: () => ({ property: ast.SymbolPrivatePropertyNode({ name: "p" }) }),
			Sub: () => ({ property: ast.NumberNode({ value: 1 }) }),
			ObjectKeyVal: () => ({ kind: "init" }),
			PrivateGetter: () => ({ key: method("PrivateIdentifier") }),
			PrivateSetter: () => ({ key: method("PrivateIdentifier") }),
			PrivateMethod: () => ({ key: method("PrivateIdentifier"), kind: "method" }),
			ClassGetter: () => ({ key: method() }),
			ClassSetter: () => ({ key: method() }),
			ClassMethod: () => ({ key: method(), kind: "method" }),
			ClassProperty: () => ({ key: ast.SymbolClassPropertyNode({ name: "p" }) }),
			ClassPrivateProperty: () => ({ key: ast.SymbolPrivatePropertyNode({ name: "p" }) }),
			NameMapping: () => ({ local: ast.SymbolExportNode({ name: "*" }) }),
			ExportSpecifier: () => ({ local: ast.SymbolExportNode({ name: "a" }) }),
			ImportSpecifier: () => ({ local: ast.SymbolImportNode({ name: "a" }) }),
			ImportNamespaceSpecifier: () => ({ local: ast.SymbolImportNode({ name: "a" }) }),
			String: () => ({ value: "a" }),
			Number: () => ({ value: 1 }),
			BigInt: () => ({ value: "1" }),
			RegExp: () => ({ value: { source: "a", flags: "" } })
		};
		const classNames = [
			...new Set(Object.values(NODE_KIND_ANCESTRY).flat())
		].filter((name) => typeof ast[`is${name}Node`] === "function");
		let probed = 0;
		for (const name of Object.keys(NODE_KIND_ANCESTRY)) {
			const factory = ast[`${name}Node`];
			const probe = factory(props[name] ? props[name]() : {});
			probed++;
			expect([name, ast.kindOf(probe)]).toEqual([name, name]);
			const classes = ancestry(name);
			expect(ast.isSyntaxNode(probe)).toBe(true);
			for (const other of classNames) {
				expect([name, other, ast[`is${other}Node`](probe)]).toEqual([
					name,
					other,
					classes.includes(other)
				]);
			}
		}
		expect(probed).toBeGreaterThan(120);
		expect([null, undefined, "x", 1, { type: "Identifier", role: "reference" }].some(ast.isSyntaxNode)).toBe(false);
		expect(ast.isSymbolRefNode({ type: "Identifier", role: "reference" })).toBe(false);
	});

	it("should look native objects up as terser's native-objects.js does", async () => {
		const helpers =
			/** @type {import("../../lib/javascript/syntax-printer").Phase} */ (
				PHASES.find((phase) => phase.name === "helpers")
			);
		const modules = await loadTerserSources(importTerserSource);
		const reference = modules.nativeObjects;
		helpers.install(modules);
		const own = modules.nativeObjects;
		expect(own).not.toBe(reference);
		expect(Object.keys(own).sort()).toEqual(Object.keys(reference).sort());
		expect(own.pure_prop_access_globals).toEqual(
			reference.pure_prop_access_globals
		);

		const data = require("../../lib/javascript/syntax-printer-data").nativeObjectTables();
		/** @type {Set<string>} */
		const globalNames = new Set(["globalThis", "Reflect", "unknownGlobal"]);
		/** @type {Set<string>} */
		const memberNames = new Set(["unknownMember", "__proto__", "hasOwn"]);
		/**
		 * @param {(string | { name: string })[]} names a table's names
		 * @param {Set<string>} into where to collect them
		 */
		const collect = (names, into) => {
			for (const entry of names) {
				into.add(typeof entry === "string" ? entry : entry.name);
			}
		};
		collect(data.NATIVE_PURE_ACCESS_GLOBALS, globalNames);
		collect(data.NATIVE_PURE_FUNCTIONS, globalNames);
		for (const table of [
			data.NATIVE_PURE_METHODS,
			data.NATIVE_PURE_STATIC_FUNCTIONS,
			data.NATIVE_PURE_STATIC_PROPERTIES
		]) {
			for (const globalName of Object.keys(table)) {
				globalNames.add(globalName);
				collect(table[globalName].names, memberNames);
			}
		}

		for (const unsafe of [true, false, 0]) {
			for (const ecma of [5, 2015, 2020, 2021, 2022, 2025, 2026]) {
				/** @type {Record<string, unknown>} */
				const options = { unsafe, builtins_ecma: ecma };
				const compressor = {
					/**
					 * @param {string} key an option
					 * @returns {unknown} its value
					 */
					option: (key) => options[key]
				};
				const label = `unsafe: ${unsafe}, builtins_ecma: ${ecma}`;
				/** @type {string[]} */
				const mismatches = [];
				for (const name of /** @type {const} */ ([
					"pure_access_globals",
					"is_pure_native_fn"
				])) {
					const expected = reference[name](compressor);
					const actual = own[name](compressor);
					for (const globalName of globalNames) {
						if (actual(globalName) !== expected(globalName)) {
							mismatches.push(`${label} ${name}(${globalName})`);
						}
					}
				}
				for (const name of /** @type {const} */ ([
					"is_pure_native_method",
					"is_pure_native_static_fn",
					"is_pure_native_static_property"
				])) {
					const expected = reference[name](compressor);
					const actual = own[name](compressor);
					for (const globalName of globalNames) {
						for (const memberName of [...memberNames, 0]) {
							if (
								actual(globalName, memberName) !==
								expected(globalName, memberName)
							) {
								mismatches.push(
									`${label} ${name}(${globalName}, ${memberName})`
								);
							}
						}
					}
				}
				expect(mismatches).toEqual([]);
			}
		}
	});

	it("should find pure builtin calls as terser's native-objects.js does", async () => {
		const helpers =
			/** @type {import("../../lib/javascript/syntax-printer").Phase} */ (
				PHASES.find((phase) => phase.name === "helpers")
			);
		const modules = await loadTerserSources(importTerserSource);
		const reference = modules.nativeObjects;
		helpers.install(modules);
		const own = modules.nativeObjects;
		const toplevel = modules.parse.parse(
			[
				"var x = 3, list = [1];",
				"Array(1); new Array(1); new Array(-1); new Array(1, 2); new Array(x);",
				"new Set; new Set([]); new Set(x); new WeakMap([]); new Map(list);",
				"new Float32Array(3); new Int8Array([]); new Uint8Array(-1);",
				"new ArrayBuffer(x); BigInt(1); new BigInt(1); new AggregateError;",
				"Math.abs(1); Math.nope(); String.fromCodePoint(1); Object.keys(x);",
				"globalThis.Math.max(); globalThis.Map(); globalThis.String(1);",
				"globalThis.a.b.c(); foo(); x(); x.y(); (0, Math.abs)(1); new Promise;",
				"RegExp.escape(''); Error.isError(x); Array.of(1); a.Math.abs();"
			].join("\n")
		);
		toplevel.figure_out_scope({});
		/** @type {import("../../lib/javascript/syntax-printer").Node[]} */
		const calls = [];
		modules.ast.walk(
			toplevel,
			(/** @type {import("../../lib/javascript/syntax-printer").Node} */ node) => {
				if (node instanceof modules.ast.AST_Call) calls.push(node);
			}
		);
		expect(calls.length).toBeGreaterThan(30);
		// terser's classes are shared with later tests, so each getter put on them
		// is taken off again, restoring what the prototype held before.
		/** @type {[Record<string, unknown>, string][]} */
		const renamed = [
			[modules.ast.AST_Call.prototype, "arguments"],
			[modules.ast.AST_Call.prototype, "callee"],
			[modules.ast.AST_PropAccess.prototype, "object"]
		];
		const saved = renamed.map(([prototype, key]) =>
			Object.getOwnPropertyDescriptor(prototype, key)
		);
		try {
			// webpack's helpers read a call's and a property read's fields under
			// ESTree's names.
			Object.defineProperty(modules.ast.AST_Call.prototype, "arguments", {
				configurable: true,
				get() {
					return this.args;
				}
			});
			Object.defineProperty(modules.ast.AST_Call.prototype, "callee", {
				configurable: true,
				get() {
					return this.expression;
				}
			});
			Object.defineProperty(modules.ast.AST_PropAccess.prototype, "object", {
				configurable: true,
				get() {
					return this.expression;
				}
			});
			/** @type {boolean[][]} */
			const expectations = [];
			for (const unsafe of [true, false]) {
				for (const ecma of [5, 2015, 2020, 2021, 2022, 2025, 2026]) {
					const compressor = new modules.compress.Compressor(
						{ unsafe, builtins_ecma: ecma },
						{}
					);
					expectations.push(
						calls.map((call) =>
							reference.is_pure_builtin_call(compressor, call)
						)
					);
				}
			}
			// webpack's helpers read a property read's name off a node, as ESTree
			// holds it, where terser's tree holds a string, and a symbol's definition
			// off a field, where terser's has a method.
			modules.ast.walk(
				toplevel,
				(
					/** @type {import("../../lib/javascript/syntax-printer").Node} */ node
				) => {
					if (node instanceof modules.ast.AST_Dot) {
						// terser's dot holds its property as a string.
						const name = /** @type {string} */ (
							/** @type {unknown} */ (node.property)
						);
						node.property = /** @type {import("../../lib/javascript/syntax-printer").Node} */ ({
							name
						});
					}
					if (node instanceof modules.ast.AST_Symbol) {
						node.definition = node.thedef;
					}
				}
			);
			// webpack's helpers read a symbol's value through `ast`, not a method.
			modules.ast.fixedValue = (/** @type {EXPECTED_ANY} */ node) =>
				node.fixed_value();
			for (const unsafe of [true, false]) {
				for (const ecma of [5, 2015, 2020, 2021, 2022, 2025, 2026]) {
					const compressor = new modules.compress.Compressor(
						{ unsafe, builtins_ecma: ecma },
						{}
					);
					const expected = /** @type {boolean[]} */ (expectations.shift());
					for (const name of [
						"pure_access_globals",
						"is_pure_native_fn",
						"is_pure_native_method",
						"is_pure_native_static_fn",
						"is_pure_native_static_property"
					]) {
						compressor[name] = own[name](compressor);
					}
					expect(
						calls.map((call) => own.is_pure_builtin_call(compressor, call))
					).toEqual(expected);
					expect(expected).toContain(true);
				}
			}
		} finally {
			for (const [i, [prototype, key]] of renamed.entries()) {
				const descriptor = saved[i];
				if (descriptor) Object.defineProperty(prototype, key, descriptor);
				else delete prototype[key];
			}
		}
	});

	it("should count a node's size inside a size being counted", async () => {
		const { ast, parse } = (await load()).modules;
		const toplevel = parse.parse("var a = 1; var b = (c) => c + a;");
		const [first, second] = toplevel.body;
		const whole = ast.nodeSize(toplevel);
		const inner = ast.nodeSize(first);
		// The count asks whether an arrow is braceless, which here counts again.
		const isBraceless = ast.isBraceless;
		let nested = 0;
		let calls = 0;
		ast.isBraceless = (
			/** @type {import("../../lib/javascript/syntax-printer").Node} */ node
		) => {
			calls++;
			nested = ast.nodeSize(first);
			return isBraceless(node);
		};
		try {
			expect(ast.nodeSize(toplevel)).toBe(whole);
		} finally {
			ast.isBraceless = isBraceless;
		}
		expect(calls).toBeGreaterThan(0);
		expect(nested).toBe(inner);
		expect(ast.nodeSize(second)).toBeGreaterThan(0);
	});

	it("should size and compare every node as terser does", async () => {
		const {
			minify,
			modules: { ast }
		} = await load();
		const reference = terserReference();
		// A compressed tree holds the nodes only the compressor makes, as `NaN`.
		/** @type {[string, EXPECTED_OBJECT][]} */
		const sources = [
			[SIZED_SCRIPT, { compress: false }],
			[SIZED_MODULE, { compress: false, module: true }],
			["sink(NaN, void 0, 1 / 0, a + +b, a - -b);", { compress: {} }]
		];
		for (const [source, options] of sources) {
			/**
			 * @returns {EXPECTED_ANY} the options, asking for the tree
			 */
			const settings = () => ({
				...options,
				parse: /** @type {EXPECTED_ANY} */ (options).parse,
				mangle: false,
				format: { ast: true, code: false }
			});
			const { ast: ourTree } = /** @type {EXPECTED_ANY} */ (
				await minify(source, settings())
			);
			/** @type {EXPECTED_ANY[]} */
			const ours = [];
			ast.walkNode(ourTree, ast.createWalker((/** @type {EXPECTED_ANY} */ node) => {
					ours.push(node);
				})
			);
			// terser's published build hands out its own tree, sized and compared
			// by terser's own methods.
			const { ast: tree } = /** @type {EXPECTED_ANY} */ (
				await reference.minify(source, settings())
			);
			/** @type {EXPECTED_ANY[]} */
			const theirs = [];
			tree.walk({
				/**
				 * @param {EXPECTED_ANY} node a node of terser's tree
				 * @param {EXPECTED_FUNCTION=} descend walks its children
				 */
				_visit(node, descend) {
					// terser's parser leaves some accessors' `async` and `is_generator`
					// unset where webpack's writes false, which `equivalent_to` reads.
					if (kindName(node) === "Accessor" && node.async === undefined) {
						node.async = false;
						node.is_generator = false;
					}
					// webpack holds a hole as null, which no walk reaches.
					if (kindName(node) !== "Hole") theirs.push(node);
					if (descend) descend.call(node);
				}
			});
			expect(ours.map((node) => [terserTypeOf(kindName(node)), ast.nodeSize(node)])).toEqual(
				theirs.map((node) => [kindName(node), node.size()])
			);
			for (let i = 0; i < ours.length; i++) {
				for (let j = 0; j < ours.length; j++) {
					if (kindName(ours[i]) !== kindName(ours[j])) continue;
					expect([i, j, ast.isEquivalent(ours[i], ours[j])]).toEqual([
						i,
						j,
						theirs[i].equivalent_to(theirs[j])
					]);
				}
			}
		}
	});

	it("should mangle names and properties as terser does under every option", async () => {
		const { minify } = await load();
		const reference = terserReference();
		/** @type {[string, () => EXPECTED_OBJECT][]} */
		const variants = [
			[MANGLED_PROPERTIES, () => ({ mangle: { properties: true } })],
			[
				MANGLED_PROPERTIES,
				() => ({ mangle: { properties: { keep_quoted: true } } })
			],
			[
				MANGLED_PROPERTIES,
				() => ({ mangle: { properties: { keep_quoted: "strict" } } })
			],
			[MANGLED_PROPERTIES, () => ({ mangle: { properties: { debug: true } } })],
			[
				MANGLED_PROPERTIES,
				() => ({ mangle: { properties: { debug: "suffix" } } })
			],
			[
				MANGLED_PROPERTIES,
				() => ({
					mangle: {
						properties: { regex: "^(alpha|beta)$", reserved: ["gamma"] }
					}
				})
			],
			[
				MANGLED_PROPERTIES,
				() => ({
					mangle: { properties: { undeclared: true, builtins: true } }
				})
			],
			[
				MANGLED_PROPERTIES,
				() => ({ compress: false, mangle: { properties: true } })
			],
			[
				MANGLED_PROPERTIES,
				() => ({
					mangle: { properties: { only_cache: true } },
					nameCache: { props: { props: { $alpha: "Q" } } }
				})
			],
			[
				MANGLED_NAMES,
				() => ({ compress: false, mangle: { keep_fnames: true } })
			],
			[
				MANGLED_NAMES,
				() => ({ compress: false, mangle: { keep_fnames: /^kept/ } })
			],
			[MANGLED_NAMES, () => ({ compress: false, mangle: { safari10: true } })],
			[MANGLED_NAMES, () => ({ compress: false, mangle: { ie8: true } })],
			[
				MANGLED_NAMES,
				() => ({ compress: { passes: 2, inline: 3 }, mangle: true })
			],
			[
				MANGLED_MODULE,
				() => ({ module: true, mangle: { toplevel: true }, nameCache: {} })
			],
			[
				MANGLED_MODULE,
				() => ({
					module: true,
					compress: false,
					mangle: { keep_fnames: true, toplevel: true },
					nameCache: { vars: { props: { $hidden: "z" } } }
				})
			]
		];
		for (const [source, options] of variants) {
			const ourOptions = /** @type {EXPECTED_ANY} */ (options());
			const theirOptions = /** @type {EXPECTED_ANY} */ (options());
			const ours = await minify(source, ourOptions);
			const theirs = await reference.minify(source, theirOptions);
			expect([ourOptions.mangle, ours.code]).toEqual([
				theirOptions.mangle,
				theirs.code
			]);
			expect(ourOptions.nameCache).toEqual(theirOptions.nameCache);
		}
	});

	it("should compare trees as terser does", async () => {
		const { ast, parse } = (await load()).modules;
		const [first, second, third, fourth] = parse.parse(
			"a.b(c + 1); a.b(c + 1); a.b(c + 2); a.b(c, 1);"
		).body;
		expect(ast.isEquivalent(first, second)).toBe(true);
		expect(ast.isEquivalent(first, third)).toBe(false);
		expect(ast.isEquivalent(first, fourth)).toBe(false);
	});

	it("should refuse an option terser refuses", async () => {
		const { minify } = await load();
		const options = /** @type {EXPECTED_ANY} */ ({ unknown: true });
		const reference = await terserReference()
			.minify("a;", options)
			.then(
				() => "",
				(/** @type {Error} */ err) => `${err.name}: ${err.message}`
			);
		await expect(minify("a;", options)).rejects.toThrow(
			reference.replace(/^DefaultsError: /, "")
		);
		expect(reference).toMatch(/^DefaultsError: /);
	});

	it("should write the source map terser writes", async () => {
		const { minify } = await load();
		const terser = terserReference();
		const input = await terser.minify(
			{ "in.js": "function add(a, b) {\n  return a + b;\n}\nconsole.log(add(1, 2));\n" },
			{ sourceMap: { includeSources: true } }
		);
		const source = "var one = 1;\nfunction two(x) { return x * 2; }\nconsole.log(two(one));\n";
		/** @type {[Record<string, string>, import("terser").SourceMapOptions][]} */
		const cases = [
			[{ "a.js": source }, {}],
			[{ "a.js": source }, { includeSources: true, filename: "a.min.js", root: "/r" }],
			[{ "b.js": /** @type {string} */ (input.code) }, { content: /** @type {string} */ (input.map), includeSources: true }],
			[{ "b.js": /** @type {string} */ (input.code) }, { content: /** @type {string} */ (input.map) }],
			[{ "b.js": /** @type {string} */ (input.code) }, { content: JSON.parse(/** @type {string} */ (input.map)), asObject: true }]
		];
		for (const [files, sourceMap] of cases) {
			const ours = await minify(files, { sourceMap: { ...sourceMap } });
			const reference = await terser.minify(files, { sourceMap: { ...sourceMap } });
			expect(ours.code).toBe(reference.code);
			expect(ours.map).toStrictEqual(reference.map);
		}
	});

	// cspell:disable -- VLQ-encoded source-map mappings strings below
	it("should map through an input map as terser reads it, index maps and decoded mappings included", async () => {
		const { minify } = await load();
		const terser = terserReference();
		const source = "var one = 1;\nfunction two(x) { return x * 2; }\nconsole.log(two(one));\n";
		/** @type {(string | Record<string, EXPECTED_ANY>)[]} */
		const inputs = [
			{
				version: 3,
				sections: [
					{ offset: { line: 0, column: 0 }, map: { version: 3, sources: ["./a/../one.js"], sourcesContent: ["one"], names: ["n"], mappings: "AAAAA,EAAC;AACA" } },
					{
						offset: { line: 1, column: 4 },
						map: {
							version: 3,
							sections: [
								{ offset: { line: 0, column: 2 }, map: JSON.stringify({ version: 3, sourceRoot: "root", sources: ["two.js", null], names: [], mappings: "AAAA,CACA;ACAA,BAAA" }) },
								{ offset: { line: 1, column: 0 }, map: { version: 3, sources: ["three.js"], names: [], mappings: "AAAA" } }
							]
						}
					},
					{ offset: { line: 2, column: 0 }, map: { version: 3, sources: ["four.js"], names: [], mappings: ";AAAA" } }
				]
			},
			{ version: 3, sources: ["one.js"], names: ["x"], mappings: [[[8, 0, 0, 0, 0], [0, 0, 1, 1]], [], [[3, 0, 2, 2], [0]]] },
			JSON.stringify({ version: 3, sources: ["one.js"], names: [], mappings: [[[8, 0, 0, 0], [0, 0, 1, 1]]] }),
			{ version: 3, sources: ["one.js"], names: [], mappings: "IAAA,AACC;;GAAE,A" },
			{ version: 3, sources: ["one.js"], names: [], mappings: "!A" }
		];
		for (const content of inputs) {
			for (const compress of [false, undefined]) {
				const options = () => ({ compress, mangle: false, sourceMap: { content: JSON.parse(JSON.stringify(content)), includeSources: true } });
				const ours = await minify({ "in.js": source }, options());
				const reference = await terser.minify({ "in.js": source }, options());
				expect(ours.map).toBe(reference.map);
			}
		}
		const invalid = { version: 3, sources: [] };
		/**
		 * @param {(code: Record<string, string>, options: import("terser").MinifyOptions) => Promise<EXPECTED_ANY>} run a minify
		 * @returns {Promise<string>} the message it rejects with
		 */
		const rejection = (run) =>
			run({ "in.js": source }, { sourceMap: { content: /** @type {EXPECTED_ANY} */ (invalid) } }).then(
				() => "",
				(error) => error.message
			);
		const message = await rejection(minify);
		expect(message).toMatch(/^invalid source map: /);
		expect(message).toBe(await rejection(terser.minify));
	});
	// cspell:enable

	// terser 5.51 loops until out of memory on these, so only ours is run.
	it("should refuse a `type` or `interface` statement", async () => {
		const { minify } = await load();
		for (const source of ["type T = number;", "interface I {}"]) {
			await expect(minify(source, {})).rejects.toThrow("Unexpected token");
		}
		// `type` before a line break is a name, which terser reads as one.
		const identifier = "var type = 1, T; type\nT = 2; log(type, T);";
		expect((await minify(identifier, {})).code).toBe(
			(await require("terser").minify(identifier, {})).code
		);
	});

	it("should read characters as terser's unicode helpers do", async () => {
		const terserUnicode = await import(
			require.resolve("terser").replace(/dist[\\/]bundle\.min\.js$/, "lib/unicode.js")
		);
		const ours = createUnicode();
		/** @type {string[]} */
		const disagreements = [];
		for (let code = 0; code <= 0x10ffff; code++) {
			const character = String.fromCodePoint(code);
			for (const [mine, theirs] of [
				[ours.isIdentifierStart, terserUnicode.is_identifier_start],
				[ours.isIdentifierChar, terserUnicode.is_identifier_char],
				[ours.isIdentifierStartBroad, terserUnicode.is_identifier_start_broad],
				[ours.isIdentifierCharBroad, terserUnicode.is_identifier_char_broad]
			]) {
				if (mine(character) !== theirs(character)) {
					disagreements.push(`${theirs.name} U+${code.toString(16)}`);
				}
			}
		}
		expect(disagreements).toEqual([]);
		for (const text of ["a\u{1F600}b", "\uD83D", "\uDE00x", "x\uD83D\uDE00"]) {
			for (let i = 0; i < text.length; i++) {
				expect(ours.getFullChar(text, i)).toBe(
					terserUnicode.get_full_char(text, i)
				);
				expect(ours.getFullCharCode(text, i)).toBe(
					terserUnicode.get_full_char_code(text, i)
				);
			}
		}
		for (const name of ["a", "$_9", "9a", "a-b", "é", ""]) {
			expect(ours.isBasicIdentifier(name)).toBe(
				terserUnicode.is_basic_identifier_string(name)
			);
		}
	});

	it("should name each node the ESTree type terser converts it to", async () => {
		const { ast, parse } = (await load()).modules;

		const source = `"use strict";
			import a, { b as c, "d" as e } from "f"; import * as g from "h";
			export default class extends a { static #p = 1; static { g(); } get [c]() { return #p in this; } set s(v) {} m() {} q = 2; #r() {} }
			export { a as default2, e as "q r" }; export * from "i"; export * as j from "k";
			export const l = 1, { m, ...n } = o, [p = 1, ...q] = r;
			export function* s(t, u = 1, ...v) { yield t; yield* u; }
			label: for (let w = 0; w < 1; w++) { if (w) continue label; else break; }
			for (const x in y) ; for (const z of y) ; do ; while (0); while (0) ;
			switch (a) { case 1: debugger; default: }
			try { throw a } catch ({ e }) {} finally {}
			(async () => { await a; for await (const b of c); })();
			new a(...b)?.c?.[d]?.(e); a = b ? c : d; a += typeof b; a++; --a; !a;
			a = { b, c: 1, [d]: 2, get e() {}, set e(f) {}, g() {}, async *h() {}, ...i };
			a = [, b, ...c]; a = \`x\${b}y\`; a = tag\`z\`; a = /re/g; a = 1n; a = null;
			a = true; a = void 0; a = NaN; a = Infinity; a = (b, c); a = b ?? (c && d || e);
			a = import.meta; a = import("x"); function f() { new.target; return this; }`;
		let count = 0;
		const walker = ast.createWalker((/** @type {EXPECTED_ANY} */ node) => {
			const parent = walker.parent();
			let expected;
			if (
				(terserTypeOf(kindName(node)) === "ObjectGetter" ||
					terserTypeOf(kindName(node)) === "ObjectSetter") &&
				kindName(parent) !== "Object"
			) {
				// terser maps a class's members with the index as their parent, which
				// reads a class accessor as an object's; ESTree makes it a method.
				expected = { type: "MethodDefinition" };
			} else if (terserTypeOf(kindName(node)) === "Expansion") {
				// terser's converter reads this off its own stack, and makes a rest
				// parameter a spread; ESTree binds with a rest element in both.
				expected = {
					type:
						terserTypeOf(kindName(parent)) === "Destructuring" ||
						ast.isLambdaNode(parent)
							? "RestElement"
							: "SpreadElement"
				};
			} else if (
				kindName(node) === "SymbolPrivateProperty" ||
				(kindName(node) === "SymbolMethod" &&
					kindName(parent).startsWith("Private"))
			) {
				// terser converts a private name with its holder, as ESTree's own type.
				expected = { type: "PrivateIdentifier" };
			} else if (
				kindName(node) !== "TemplateSegment" &&
				terserTypeOf(kindName(node)) !== "NameMapping"
			) {
				expected = ast.toEstree(node, parent);
			} else if (kindName(node) === "TemplateSegment") {
				expected = ast.toEstree(parent).quasi || ast.toEstree(parent);
				expected = { type: expected.quasis[0].type };
			} else {
				// A name mapping is converted with its declaration, as a specifier.
				const list = parent.imported_names || parent.exported_names;
				const converted = ast.toEstree(parent);
				// `export * as a` names what it exports on the declaration itself.
				expected =
					converted.specifiers === undefined
						? null
						: converted.specifiers.filter(
								(/** @type {{ type: string }} */ specifier) =>
									specifier.type !== "ImportDefaultSpecifier"
							)[list.indexOf(node)];
			}
			// The mapping `export *` makes, which ESTree has no node for, is walked
			// as a specifier.
			expect([kindName(node), node.type]).toEqual([
				kindName(node),
				expected === null ? "ExportSpecifier" : expected.type
			]);
			// A class whose every node has one ESTree type holds it as `type`.
			if (node.type !== undefined && expected !== null) {
				expect([kindName(node), node.type]).toEqual([kindName(node), expected.type]);
			}
			count++;
		});
		ast.walkNode(parse.parse(source, { module: true }), walker);
		ast.walkNode(parse.parse("with (a) b;"), walker);
		expect(count).toBeGreaterThan(300);
	});

	it("should hand back a list anew only where a transform changes it", async () => {
		const { ast, parse, utils } = (await load()).modules;
		const { createTransformer } = ast;
		const toplevel = parse.parse("a; b; c; d;");
		const { body } = toplevel;
		ast.transformNode(toplevel, createTransformer(() => undefined));
		expect(toplevel.body).toBe(body);

		ast.transformNode(toplevel, createTransformer(
				/**
				 * @param {EXPECTED_ANY} node the node visited
				 * @returns {EXPECTED_ANY} what replaces it
				 */
				(node) => {
					if (!ast.isSimpleStatementNode(node)) return;
					const name = node.expression.name;
					if (name === "b") return utils.MAP.skip;
					if (name === "c") return utils.MAP.splice([node, node]);
					return node;
				}
			)
		);
		expect(toplevel.body).not.toBe(body);
		expect(
			toplevel.body.map(
				(/** @type {EXPECTED_ANY} */ statement) => statement.expression.name
			)
		).toEqual(["a", "c", "c", "d"]);
	});

	it("should hand a pure_funcs function a call read with terser's names", async () => {
		const { minify } = await load();
		/** @type {unknown[]} */
		const seen = [];
		const { code } = /** @type {EXPECTED_ANY} */ (
			await minify("a.b(c + 1, d); e(f);", {
				compress: {
					pure_funcs: (/** @type {EXPECTED_ANY} */ node) => {
						seen.push([
							node.args.length,
							node.args[0].print_to_string(),
							node.expression.print_to_string(),
							node.expression.expression && node.expression.expression.name
						]);
						return node.expression.name !== "e";
					}
				},
				mangle: false
			})
		);
		// Asked once a pass, the first call twice.
		expect(seen).toEqual([
			[2, "c+1", "a.b", "a"],
			[1, "f", "e", undefined],
			[2, "c+1", "a.b", "a"]
		]);
		expect(code).toBe("a.b(c+1,d),f;");
	});

	it("should not revisit a node the compressor squeezed", async () => {
		const { ast, compress, flags, parse } = (await load()).modules;
		const compressor = compress.createCompressor({}, {});
		const toplevel = parse.parse('"use strict"; a;');
		const [directive, statement] = toplevel.body;
		directive.flags |= flags.SQUEEZED;
		statement.flags |= flags.SQUEEZED;
		expect(ast.transformNode(statement, compressor)).toBe(statement);
		expect(compressor.stack).toEqual([]);
		// A directive is still pushed, which records it on the walker.
		expect(ast.transformNode(directive, compressor)).toBe(directive);
		expect(compressor.has_directive("use strict")).toBe(directive);
		expect(ast.createWalker().webpackSkipsSqueezed).toBe(false);
	});

	describe("fields named as ESTree names them", () => {
		// Each field the node classes take ESTree's name for, read and written
		// by every phase: a loop, branch, call, generator, class, template, try.
		const SOURCE = `
			function* walk(list, ...rest) {
				var index = 0, total;
				for (let i = 0; i < list.length; i++) if (list[i]) total = i; else continue;
				do { index++; } while (index < rest.length && cond(index));
				while (index--) yield* rest;
				try { use(total ? list : rest); } catch ({ message }) { log(message); } finally { done(); }
				switch (index) { case 0: total = 1; break; default: total = 2; }
				for (var key in list) index += key;
				return tag\`a\${index}b\` + (total ? 1 : 2);
			}
			class Base { m() { return 1; } }
			class Derived extends Base { m() { return new Base(walk([1, 2], 3)).m(); } }
			if (typeof window === "object") sink(Derived); else sink(Base, walk);
			sink([1, 2].map((item) => item ? item * 2 : 0), Math.max.apply(Math, [1, 2]));
		`;

		it("should give the nodes it builds ESTree's names", async () => {
			const { parse } = (await load()).modules;
			const [walk, , derived, branch] = parse.parse(SOURCE).body;
			expect(Object.keys(walk)).toEqual(
				expect.arrayContaining(["params", "generator"])
			);
			expect(Object.keys(walk)).not.toContain("argnames");
			expect(Object.keys(walk.body.body[0])).toContain("declarations");
			expect(Object.keys(walk.body.body[1])).toEqual(
				expect.arrayContaining(["test", "update"])
			);
			expect(Object.keys(walk.body.body[1].body)).toEqual(
				expect.arrayContaining(["test", "alternate"])
			);
			expect(Object.keys(walk.body.body[4])).toEqual(
				expect.arrayContaining(["handler", "finalizer"])
			);
			expect(Object.keys(walk.body.body[4].handler)).toContain("param");
			expect(kindName(walk.body)).toBe("BlockStatement");
			expect(kindName(walk.body.body[4].block)).toBe("TryBlock");
			expect(kindName(walk.body.body[4].handler.body)).toBe("BlockStatement");
			expect(Object.keys(walk.body.body[3].body)).toContain("expression");
			expect(Object.keys(walk.body.body[3].body)).not.toContain("body");
			expect(Object.keys(walk.body.body[3].body.expression)).toEqual(
				expect.arrayContaining(["argument", "delegate"])
			);
			expect(Object.keys(walk.body.body[7].argument.left)).toEqual(
				expect.arrayContaining(["tag", "quasi"])
			);
			expect(Object.keys(walk)).toContain("id");
			expect(Object.keys(walk.body.body[0].declarations[0])).toEqual(
				expect.arrayContaining(["id", "init"])
			);
			expect(Object.keys(walk.body.body[1].body)).toContain("consequent");
			expect(Object.keys(walk.body.body[5])).toEqual(
				expect.arrayContaining(["discriminant", "cases"])
			);
			expect(Object.keys(walk.body.body[5].cases[0])).toEqual(
				expect.arrayContaining(["test", "consequent"])
			);
			expect(Object.keys(walk.body.body[6])).toEqual(
				expect.arrayContaining(["left", "right"])
			);
			expect(Object.keys(derived)).toEqual(
				expect.arrayContaining(["id", "superClass"])
			);
			expect(Object.keys(derived)).not.toContain("properties");
			expect(kindName(derived.body)).toBe("ClassBody");
			expect(kindName(derived.body.body[0])).toBe("ClassMethod");
			const call = branch.consequent.expression;
			expect(Object.keys(call)).toEqual(
				expect.arrayContaining(["callee", "arguments"])
			);
			expect(Object.keys(branch.test.left)).toContain("argument");
		});

		it("should hold keys and members in ESTree's shapes", async () => {
			const { parse } = (await load()).modules;
			const [object, members] = parse.parse(
				"({ a, 'b': 1, [c]: 2, get d() {}, e() {} }); class F { constructor() {} static g() {} set #h(v) {} i = j.k[l].#h }"
			).body;
			const properties = object.expression.properties;
			/**
			 * @param {EXPECTED_ANY} node a member
			 * @returns {unknown[]} its key's type and name, and its ESTree fields
			 */
			const shape = (node) => [
				kindName(node.key),
				node.key.name,
				node.computed,
				node.kind,
				node.method,
				node.shorthand
			];
			expect(properties.map(shape)).toEqual([
				["SymbolProperty", "a", false, "init", false, true],
				["SymbolProperty", "b", false, "init", false, false],
				["SymbolRef", "c", true, "init", false, false],
				["SymbolMethod", "d", false, "get", false, false],
				["SymbolMethod", "e", false, "init", true, false]
			]);
			expect(
				members.body.body.map((/** @type {EXPECTED_ANY} */ member) =>
					shape(member).slice(0, 4)
				)
			).toEqual([
				["SymbolMethod", "constructor", false, "constructor"],
				["SymbolMethod", "g", false, "method"],
				// terser names a private method with a method's symbol.
				["SymbolMethod", "h", false, "set"],
				["SymbolClassProperty", "i", false, undefined]
			]);
			const hash = members.body.body[3].value;
			expect([hash.computed, kindName(hash.property), hash.property.name]).toEqual([
				false,
				"SymbolPrivateProperty",
				"h"
			]);
			expect([hash.object.computed, kindName(hash.object.property)]).toEqual([
				true,
				"SymbolRef"
			]);
			const dot = hash.object.object;
			expect([dot.computed, kindName(dot.property), dot.property.name]).toEqual([
				false,
				"SymbolProperty",
				"k"
			]);
			const [patterns, privateIn] = parse.parse(
				"var [p, , q] = r, { s, ...t } = u; class V { #w; x(y) { return #w in y; } }"
			).body;
			const [arrayPattern, objectPattern] = patterns.declarations.map(
				(/** @type {EXPECTED_ANY} */ declaration) => declaration.id
			);
			expect([
				arrayPattern.elements.length,
				arrayPattern.elements[1],
				arrayPattern.properties
			]).toEqual([3, null, null]);
			expect([objectPattern.elements, objectPattern.properties.length]).toEqual(
				[null, 2]
			);
			const test = privateIn.body.body[1].value.body.body[0].argument;
			expect([kindName(test.left), test.left.name, test.right.name]).toEqual([
				"SymbolPrivateProperty",
				"w",
				"y"
			]);
			const [imports, exports] = parse.parse(
				"import { a as b, c } from 'd'; export { b as e };",
				{ module: true }
			).body;
			/**
			 * @param {EXPECTED_ANY} mapping a specifier
			 * @returns {unknown[]} the names it holds, null where it holds none
			 */
			const names = (mapping) =>
				[mapping.imported, mapping.exported, mapping.local].map(
					(/** @type {EXPECTED_ANY} */ name) => name && name.name
				);
			expect(imports.imported_names.map(names)).toEqual([
				["a", null, "b"],
				["c", null, "c"]
			]);
			expect(exports.exported_names.map(names)).toEqual([[null, "e", "b"]]);
		});

		it("should minify them as terser does", async () => {
			const { minify } = await load();
			const reference = terserReference();
			for (const options of [
				{},
				{ compress: { passes: 3, unsafe: true, keep_fargs: false } },
				{ compress: { toplevel: true, inline: 1, sequences: false } },
				{ compress: { hoist_vars: true, hoist_funs: true }, mangle: false },
				{
					compress: {
						pure_funcs: (/** @type {EXPECTED_ANY} */ node) =>
							node.args.length !== 1 ||
							(kindName(node.expression) === "Dot" &&
								node.expression.expression.name === "Math")
					}
				},
				{ compress: false, mangle: false },
				{ format: { spidermonkey: true } }
			]) {
				const ours = /** @type {EXPECTED_ANY} */ (
					await minify(SOURCE, /** @type {EXPECTED_ANY} */ (options))
				);
				const theirs = /** @type {EXPECTED_ANY} */ (
					await reference.minify(SOURCE, /** @type {EXPECTED_ANY} */ (options))
				);
				// Positions apart: the parsers place some nodes apart.
				/**
				 * @param {string} key a key
				 * @param {unknown} value its value
				 * @returns {unknown} the value, nothing for a position
				 */
				const withoutPositions = (key, value) =>
					key === "loc" ? undefined : value;
				expect([ours.code, JSON.stringify(ours.ast, withoutPositions)]).toEqual([
					theirs.code,
					JSON.stringify(theirs.ast, withoutPositions)
				]);
			}
		});

		it("should read a tree it handed back, as terser does", async () => {
			const { minify } = await load();
			const reference = terserReference();
			/**
			 * @param {Minifying} run a minify, webpack's or terser's
			 * @returns {Promise<string | undefined>} the tree handed back, compressed
			 */
			const roundTrip = async (run) => {
				const { ast } = /** @type {EXPECTED_ANY} */ (
					await run(SOURCE, {
						compress: false,
						mangle: false,
						format: /** @type {EXPECTED_ANY} */ ({ ast: true, code: false })
					})
				);
				return (await run(ast, { compress: { passes: 2 } })).code;
			};
			expect(await roundTrip(minify)).toBe(
				await roundTrip(reference.minify)
			);
		});
	});

	describe("correct phase", () => {
		it("should install", async () => {
			const { phases } = await load();
			expect(phases).toContain("correct");
		});

		it("should still inline around a nested function owning new.target", async () => {
			const { minify } = await load();
			const input =
				"const Inner = (function () { return function () { return new.target; }; })(); console.log(new Inner() === Inner);";
			const options = { compress: { passes: 2 }, mangle: false };
			const { code } = await minify(input, options);
			const reference = await terserReference().minify(input, options);
			expect(code).toBe(reference.code);
			expect(runProgram(/** @type {string} */ (code))).toBe("true");
		});

		for (const expression of ["+1n", "1n % 0n"]) {
			it(`should defer the BigInt error from ${expression} until runtime`, async () => {
				const { minify, corrections } = await load();
				const input = `
					try { console.log(${expression}); } catch (error) { console.log(error.name); }
					try { ${expression}; } catch (error) { console.log(error.name); }
					try {
						(function () { const unused = ${expression}; })();
					} catch (error) { console.log(error.name); }
					try {
						(function (value = ${expression}) {})();
					} catch (error) { console.log(error.name); }
				`;
				const options = { compress: { passes: 2 }, mangle: false };
				const { code } = await minify(input, options);
				expect(runProgram(/** @type {string} */ (code))).toBe(runProgram(input));

				if (!corrections) throw new Error("the correct phase is not installed");
				corrections.enabled = false;
				try {
					await expect(minify(input, options)).rejects.toThrow();
					await expect(terserReference().minify(input, options)).rejects.toThrow();
				} finally {
					corrections.enabled = true;
				}
			});
		}

		it("should drop a class whose effects read only a nested class's own private name, as terser does", async () => {
			const { minify } = await load();
			const input =
				'var o = {}; (function () { class C { [(class { #f = 1; static r(x) { return #f in x; } }).r(o)] = 1; #f = 2; #g = 3; } })(); console.log("ok");';
			const { code } = await minify(input, { compress: {}, mangle: false });
			const reference = await terserReference().minify(input, {
				compress: {},
				mangle: false
			});

			expect(code).toBe(reference.code);
			expect(runProgram(/** @type {string} */ (code))).toBe(runProgram(input));
		});

		it("should drop a class whose effects read only an enclosing class's private name, as terser does", async () => {
			const { minify } = await load();
			const input =
				'class D { #p = 1; m() { var t = this; (function () { class C { [t.#p] = 1; #q = 2; } })(); return "ok"; } } console.log(new D().m());';
			const { code } = await minify(input, { compress: {}, mangle: false });
			const reference = await terserReference().minify(input, {
				compress: {},
				mangle: false
			});

			expect(code).toBe(reference.code);
			expect(code).not.toContain("class C");
		});

		it("should rename private names an indirect `eval` cannot read", async () => {
			const { minify } = await load();
			const input =
				'class C { #m = 1; get() { return (0, eval)("1") + this.#m; } } console.log(new C().get());';
			const { code } = await minify(input, { compress: false, mangle: true });

			expect(code).not.toMatch(/#m\b/);
			expect(runProgram(/** @type {string} */ (code))).toBe(runProgram(input));
		});

		it("should rename no private name onto one a direct `eval` keeps", async () => {
			const { minify } = await load();
			const input =
				'class C { #e = 1; get() { return eval("this.#e"); } } class D { #n = 2; #o = 3; get() { return this.#n + this.#o; } } console.log(new C().get(), new D().get());';
			const { code } = await minify(input, { compress: false, mangle: true });

			expect(code).toContain('#e=1;get(){return eval("this.#e")}');
			expect(code).not.toMatch(/class D\{[^}]*#e\b/);
			// A class without `eval` still has its names renamed.
			expect(code).not.toMatch(/#[no]\b/);
			expect(runProgram(/** @type {string} */ (code))).toBe(runProgram(input));
		});

		for (const [name, input, options] of CORRECTED_CASES) {
			it(`should print what the input prints: ${name}`, async () => {
				const { minify, corrections } = await load();
				const expected = runProgram(input);
				const { code } = await minify(input, options);
				expect(runProgram(/** @type {string} */ (code))).toBe(expected);

				if (!corrections) throw new Error("the correct phase is not installed");
				corrections.enabled = false;
				try {
					const uncorrected = await unimproved(() => minify(input, options));
					const reference = await terserReference().minify(input, options);
					expect(uncorrected.code).toBe(reference.code);
					expect(runProgram(/** @type {string} */ (reference.code))).not.toBe(expected);
				} finally {
					corrections.enabled = true;
				}
			});
		}
	});

	describe("a relation whose value is read", () => {
		it("should leave an `instanceof` of a built-in on a literal as terser does", async () => {
			const { minify, corrections } = await load();
			if (!corrections) throw new Error("the correct phase is not installed");
			const input =
				"[] instanceof Object; ({}) instanceof Object; 1 instanceof Number; (() => 1) instanceof Function; (class {}) instanceof Object; /a/ instanceof RegExp; console.log(1);";
			const options = { compress: {}, mangle: false };
			const { code } = await minify(input, options);
			corrections.enabled = false;
			try {
				expect((await minify(input, options)).code).toBe(code);
			} finally {
				corrections.enabled = true;
			}
			expect(code).toBe("console.log(1);");
		});

		it("should keep an `instanceof` of `Proxy`, which has no prototype", async () => {
			const { minify } = await load();
			const input =
				"try { [] instanceof Proxy; console.log('no'); } catch (e) { console.log(e.name); }";
			const { code } = await minify(input, { compress: {}, mangle: false });
			expect(code).toContain("instanceof Proxy");
			expect(runProgram(/** @type {string} */ (code))).toBe(runProgram(input));
		});

		it("should write what terser writes", async () => {
			const { minify } = await load();
			const input =
				"var F = function () {}; console.log('a' in { a: 1 }, [] instanceof Array, new F() instanceof F);";
			const options = { compress: {}, mangle: false };
			const { code } = await minify(input, options);
			const reference = await terserReference().minify(input, options);
			expect(code).toBe(reference.code);
		});
	});

	describe("an async generator returning `undefined`", () => {
		/**
		 * @param {string} code a program logging once its promises settle
		 * @returns {Promise<string>} what it logged
		 */
		const runSettled = async (code) => {
			/** @type {string[]} */
			const lines = [];
			vm.runInNewContext(code, {
				console: {
					log: (/** @type {unknown} */ value) => lines.push(String(value))
				}
			});
			for (let i = 0; i < 10; i++) {
				await new Promise((resolve) => {
					setImmediate(resolve);
				});
			}
			return lines.join("\n");
		};

		it("should keep the tick its awaited value takes", async () => {
			const { minify, corrections } = await load();
			if (!corrections) throw new Error("the correct phase is not installed");
			const input =
				"var log = [], yes = 1, no = 0, count = 0; async function* a() { return; } async function* b() { return undefined; } async function* c() { if (log) return void 0; yield 1; } async function* d() { if (yes) { count++; return; } return 1; } async function* e() { if (yes) return; else return 1; } async function* f() { if (no) return 1; else { count++; return; } } async function* g() { count++; if (no) return 1; return void 0; } Promise.resolve().then(() => log.push('tick 1')).then(() => log.push('tick 2')).then(() => console.log(log.join())); for (const run of [a, b, c, d, e, f, g]) run().next().then(() => log.push(run.name));";
			const options = { compress: {}, mangle: false };
			const expected = await runSettled(input);
			const { code } = await minify(input, options);
			expect(await runSettled(/** @type {string} */ (code))).toBe(expected);

			corrections.enabled = false;
			try {
				const uncorrected = await minify(input, options);
				expect(
					await runSettled(/** @type {string} */ (uncorrected.code))
				).not.toBe(expected);
			} finally {
				corrections.enabled = true;
			}
		});
	});

	describe("a BigInt operation nobody reads", () => {
		// The port drops `Symbol()` where terser keeps it, and refuses a constant
		// division by zero that terser drops.
		it("should keep a write to a `const` nobody reads", async () => {
			const { minify } = await load();
			const input =
				"try { (function () { const a = 1; a = 2; })(); console.log('no'); } catch (e) { console.log(e.name); }";
			const { code } = await minify(input, { compress: {}, mangle: false });
			expect(runProgram(/** @type {string} */ (code))).toBe(runProgram(input));
		});

		it("should keep a division by zero and a Symbol converted", async () => {
			const { minify } = await load();
			const input =
				"function t(f) { try { f(); console.log('no'); } catch (e) { console.log(e.name); } } t(function () { 1n / 0n; }); t(function () { 1n % 0n; }); t(function () { Symbol('1') + 0n; }); t(function () { Symbol() - 1; });";
			const { code } = await minify(input, { compress: {}, mangle: false });
			expect(runProgram(/** @type {string} */ (code))).toBe(runProgram(input));
		});

		it("should write what terser writes where it cannot throw", async () => {
			const { minify } = await load();
			const input =
				"function t() { 1n * 1n; -1n; 1n + 'a'; 2n ** 1n; 1n / 2n; 3 % 2; } t(); console.log('x');";
			const options = { compress: {}, mangle: false };
			const { code } = await minify(input, options);
			const reference = await terserReference().minify(input, options);
			expect(code).toBe(reference.code);
			expect(runProgram(/** @type {string} */ (code))).toBe(runProgram(input));
		});
	});

	describe("a spread nobody reads", () => {
		it("should write what terser writes where it runs no iterator", async () => {
			const { minify } = await load();
			const input =
				"function t(a) { [...[1, a]]; [...'ab']; var o = null; o?.f(...a); } t([1]); console.log('x');";
			const options = { compress: {}, mangle: false };
			const { code } = await minify(input, options);
			const reference = await terserReference().minify(input, options);
			expect(code).toBe(reference.code);
			expect(runProgram(/** @type {string} */ (code))).toBe(runProgram(input));
		});

		it("should keep spreading an `arguments` that is not the function's own", async () => {
			const { minify } = await load();
			const input =
				"var it = { [Symbol.iterator]() { console.log('iterated'); return [][Symbol.iterator](); } }; function a(arguments) { [...arguments]; } function b() { var arguments = it; [...arguments]; } function c() { arguments = it; [...arguments]; } a(it); b(); c();";
			const { code } = await minify(input, { compress: {}, mangle: false });
			expect(runProgram(/** @type {string} */ (code))).toBe(runProgram(input));
		});
	});

	describe("`pure_conversions`", () => {
		const input =
			"function t(f) { try { f(); console.log('no'); } catch (e) { console.log(e.name); } } var o = { valueOf() { throw { name: 'thrown' }; } }, bad = Object.create(null); t(function () { 0 == o; }); t(function () { o < 1; }); t(function () { (class { get [bad]() {} }); }); t(function () { ({ [bad]: 1 }); }); t(function () { o == null; o === 1; });";

		it("should drop a conversion as terser does by default", async () => {
			const { minify } = await load();
			const options = { compress: {}, mangle: false };
			const { code } = await minify(input, options);
			const reference = await terserReference().minify(input, options);
			expect(code).toBe(reference.code);
		});

		it("should keep a comparison or a key converting an object when off", async () => {
			const { minify } = await load();
			const withSymbols = `${input} t(function () { 1n < Symbol(); }); t(function () { (class { [Symbol.iterator]() {} }); });`;
			const { code } = await minify(withSymbols, {
				compress: { pure_conversions: false },
				mangle: false
			});
			expect(runProgram(/** @type {string} */ (code))).toBe(
				runProgram(withSymbols)
			);
		});

		it("should keep each comparison and key converting an object when off", async () => {
			const { minify } = await load();
			const { code } = await minify(input, {
				compress: { pure_conversions: false },
				mangle: false
			});
			expect(runProgram(/** @type {string} */ (code))).toBe(runProgram(input));
		});
	});

	describe("`pure_heritage`", () => {
		const input =
			"function t(f) { try { f(); console.log('no'); } catch (e) { console.log(e.name); } } var bound = function () {}.bind(); t(function () { class A extends bound {} }); t(function () { class B extends null {} class C extends class {} {} });";

		it("should drop a class extending what it cannot see as terser does by default", async () => {
			const { minify } = await load();
			const options = { compress: {}, mangle: false };
			const { code } = await minify(input, options);
			const reference = await terserReference().minify(input, options);
			expect(code).toBe(reference.code);
		});

		it("should keep a class extending what may be no constructor when off", async () => {
			const { minify } = await load();
			const { code } = await minify(input, {
				compress: { pure_heritage: false },
				mangle: false
			});
			expect(runProgram(/** @type {string} */ (code))).toBe(runProgram(input));
		});
	});

	describe("`keep_classnames` and a name a literal gives", () => {
		it("should keep `{ default: class {} }.default`, which names the class", async () => {
			const { minify } = await load();
			const input =
				"var n; const D = { default: class {} }.default, F = { default: function () {} }.default; (function () { var unused = { default: class { static f = (n = this.name); } }.default; })(); console.log(D.name, F.name, n);";
			const { code } = await minify(input, {
				compress: {},
				mangle: true,
				keep_classnames: true,
				keep_fnames: true
			});
			expect(runProgram(/** @type {string} */ (code))).toBe(runProgram(input));
		});
	});

	describe("`keep_fnames` and a private method", () => {
		const input =
			"var C = class { #method() {} static #field = function () {}; get() { return [this.#method.name, C.#field.name]; } }; console.log(new C().get().join());";

		it("should keep the private name a method's `name` reads", async () => {
			const { minify } = await load();
			const { code } = await minify(input, {
				compress: {},
				mangle: true,
				keep_fnames: true
			});
			expect(runProgram(/** @type {string} */ (code))).toBe(runProgram(input));
			const mangled = await minify(input, { compress: {}, mangle: true });
			expect(runProgram(/** @type {string} */ (mangled.code))).not.toBe(
				runProgram(input)
			);
		});

		it("should never quote a kept private name", async () => {
			const { minify } = await load();
			const program =
				"class C { #ࢶ = 1; #\u{104B0}; static #\u{104B1}() { return 2; } #if = 3; get() { return [#ࢶ in this, this.#ࢶ, C.#\u{104B1}(), this.#if]; } } console.log(new C().get().join());";
			for (const format of [{}, { ascii_only: false }, { quote_keys: true }]) {
				const { code } = await minify(program, {
					compress: {},
					mangle: true,
					keep_fnames: true,
					format: { ...format, ie8: true }
				});
				expect(code).not.toMatch(/#["']/);
				expect(runProgram(/** @type {string} */ (code))).toBe(
					runProgram(program)
				);
			}
		});
	});

	describe("a literal only a property of escapes", () => {
		it("should drop its unused reads as terser does", async () => {
			const { minify } = await load();
			const input =
				"(function () { var array = []; var push = array.push, slice = array.slice; console.log(typeof push); })();";
			const options = { compress: {}, mangle: false };
			const { code } = await unimproved(() => minify(input, options));
			const reference = await terserReference().minify(input, options);
			expect(code).toBe(reference.code);
		});
	});

	describe("what oxc proves runs no code", () => {
		/** @type {[string, string, string][]} */
		const cases = [
			[
				"a literal's conversion, a constant of `Math` and an arguments spread",
				"function f() { [...arguments]; } -[]; +{ a: 1 }; `${[1]}`; 0 - {}; Math.PI * 2; ({ ...{ set a(v) {} } }); ({ ...function () {} }); f();",
				"function f(){}f();"
			],
			[
				"a template and a concatenation kept for their conversions",
				"function f(b, d) { `a${b}c${d}e`; `x${1}${g() ? 1 : 2}${d}`; 'a' + b + 'c' + d; 'a' + (b + 'c'); b + `${d}`; } function g() {} f(1, 2);",
				'function f(b,d){`${b}${d}`,g(),`${d}`,""+b+d,b+"",b+`${d}`}function g(){}f(1,2);'
			],
			[
				"an object kept for its spreads",
				"function f(b) { ({ x: 1, ...b, ...b, [g()]: g(), y: 2, ...b }); } function g() {} f({});",
				"function f(b){({...b,...b}),g(),g(),{...b}}function g(){}f({});"
			],
			[
				"an async generator's returns merged",
				"async function* f(a, b, c) { if (a) return b; return c; } async function* g(a, c) { if (a) return; return c; } f(); g();",
				"async function*f(a,b,c){return a?b:c}async function*g(a,c){if(!a)return c}f(),g();"
			]
		];
		for (const [name, input, expected] of cases) {
			it(`should drop or reduce it as oxc does: ${name}`, async () => {
				const { minify } = await load();
				const { code } = await minify(input, { compress: {}, mangle: false });
				expect(code).toBe(expected);
			});
		}
	});

	describe("a call whose parameters run nothing", () => {
		for (const [name, input] of NO_EFFECT_PARAMETER_CASES) {
			it(`should write what terser writes: ${name}`, async () => {
				const { minify } = await load();
				const options = { compress: {}, mangle: false };
				const { code } = await minify(input, options);
				const reference = await terserReference().minify(input, options);
				expect(code).toBe(reference.code);
				expect(runProgram(/** @type {string} */ (code))).toBe(runProgram(input));
			});
		}
	});

	describe("a parameter list's scope", () => {
		it("should resolve a copied function's reads by no range an earlier analysis counted", async () => {
			const { minify } = await load();
			// The copy of `h` is analysed again, its reads counted from zero.
			const input =
				"function P(a = q + q + q + q + q) { var y = arguments.length > 1 ? 'x' : 'in'; function h() { return y; } return [1].map(function () { return h(); })[0]; } var q = 1, y = 'out'; console.log(P());";
			const { code } = await minify(input, { compress: {}, mangle: false });

			expect(runProgram(/** @type {string} */ (code))).toBe(runProgram(input));
		});

		it("should still read in a parameter list what the list and its function name declare", async () => {
			const { minify } = await load();
			for (const input of [
				"var a; function f(p = 'p', q = a = () => p) { var r = 1; } f(); console.log(a());",
				"var a; var f = function self(_ = a = () => typeof self) { var z; }; f(); console.log(a());",
				"var a; function f(_ = a = () => arguments.length) { var y; } f(1, 2); console.log(a());",
				"var a; try { throw ['e']; } catch ([e, _ = a = () => e]) { let z; } console.log(a());",
				"var x = 'out'; function f(y = x) { var x = 'in'; return y; } console.log(f());",
				"function f() { var x = 'body'; function g(_ = () => x) { return _(); } return g(); } var x = 'global'; console.log(f());",
				"var a; function h() { try { throw []; } catch ([_ = a = () => x]) { var x = 'fn'; } return a(); } console.log(h());"
			]) {
				for (const options of [
					{ compress: false, mangle: true },
					{ compress: { passes: 2 }, mangle: true }
				]) {
					const { code } = await minify(`function g() { ${input} } g();`, options);
					expect(runProgram(/** @type {string} */ (code))).toBe(
						runProgram(input)
					);
				}
			}
		});
	});

	describe("a `let` heading a statement or loop", () => {
		it("should not parenthesize a `let` or `async` nothing misreads", async () => {
			const { minify } = await load();
			const input =
				"let.a = 1; let?.[0]; x = let[0]; for (let.a in x); for (let in x); for (async.x of y); async function f() { for await (async of y); }";
			const { code } = await minify(input, { compress: false, mangle: false });

			expect(code).toBe(
				"let.a=1;let?.[0];x=let[0];for(let.a in x);for(let in x);for(async.x of y);async function f(){for await(async of y);}"
			);
		});

		for (const [name, input] of LET_HEAD_CASES) {
			it(`should print what the input prints: ${name}`, async () => {
				const { minify, corrections } = await load();
				const options = { compress: false, mangle: false };
				const expected = runProgram(input);
				const { code } = await minify(input, options);
				expect(runProgram(/** @type {string} */ (code))).toBe(expected);

				if (!corrections) throw new Error("the correct phase is not installed");
				corrections.enabled = false;
				try {
					const uncorrected = await minify(input, options);
					expect(runProgram(/** @type {string} */ (uncorrected.code))).not.toBe(expected);
				} finally {
					corrections.enabled = true;
				}
			});
		}
	});

	describe("a lexical `arguments` in a function body", () => {
		for (const [name, input] of LEXICAL_ARGUMENTS_CASES) {
			it(`should print what the input prints: ${name}`, async () => {
				const { minify, corrections } = await load();
				const options = { compress: { passes: 2 }, mangle: true };
				const expected = runProgram(input);
				const { code } = await minify(input, options);
				expect(runProgram(/** @type {string} */ (code))).toBe(expected);

				if (!corrections) throw new Error("the correct phase is not installed");
				corrections.enabled = false;
				try {
					await expect(minify(input, options)).rejects.toThrow(
						'"arguments" is redeclared'
					);
					await expect(
						terserReference().minify(input, options)
					).rejects.toThrow('"arguments" is redeclared');
				} finally {
					corrections.enabled = true;
				}
			});
		}
	});

	describe("a name a context reserves", () => {
		for (const [name, input, options] of RESERVED_NAME_CASES) {
			it(`should not write it where it is a keyword: ${name}`, async () => {
				const { minify } = await load();
				const expected = runProgram(input);
				const { code } = await minify(input, options);
				expect(runProgram(/** @type {string} */ (code))).toBe(expected);

				const reference = await terserReference().minify(input, options);
				expect(
					runProgram(/** @type {string} */ (reference.code))
				).not.toBe(expected);
			});
		}
	});

	describe("inlining a name a context reserves", () => {
		for (const [name, input] of STILL_INLINED_CASES) {
			it(`should still write what terser writes: ${name}`, async () => {
				const { minify } = await load();
				const options = {
					compress: { passes: 2 },
					mangle: false
				};
				const { code } = await minify(input, options);
				const reference = await terserReference().minify(input, options);
				expect(code).toBe(reference.code);
			});
		}
	});

	describe("improve phase", () => {
		it("should install", async () => {
			const { phases } = await load();
			expect(phases).toContain("improve");
		});

		for (const [name, input, options, written] of IMPROVED_CASES) {
			it(`should write less, printing the same: ${name}`, async () => {
				const { minify, improvements } = await load();
				const expected = runProgram(input);
				const { code } = await minify(input, options);
				expect(runProgram(/** @type {string} */ (code))).toBe(expected);
				if (written !== undefined) expect(code).toBe(written);

				if (!improvements) throw new Error("the improve phase is not installed");
				improvements.enabled = false;
				try {
					const unimproved = await minify(input, options);
					const reference = await terserReference().minify(input, options);
					expect(unimproved.code).toBe(reference.code);
					expect(/** @type {string} */ (code).length).toBeLessThan(
						/** @type {string} */ (unimproved.code).length
					);
				} finally {
					improvements.enabled = true;
				}
			});
		}

		for (const [name, input] of KEPT_CASES) {
			it(`should write what terser writes: ${name}`, async () => {
				const { minify } = await load();
				const options = { compress: {}, mangle: false };
				const { code } = await uncorrected(() => minify(input, options));
				const reference = await terserReference().minify(input, options);
				expect(code).toBe(reference.code);
			});
		}

		it("should split a `return` of `undefined` outside a function", async () => {
			const { minify } = await load();
			const { code } = await minify("if (a()) { b(); return; } c();", {
				parse: { bare_returns: true },
				compress: {},
				mangle: false
			});
			expect(code).toBe("if(a()){b();return}c();");
		});

		it("should keep a logical expression and a test for null where the shorter form needs a later ECMAScript or reads differently", async () => {
			const { minify } = await load();
			/**
			 * @param {import("terser").ECMA} ecma the ECMAScript version targeted
			 * @returns {import("terser").MinifyOptions} options targeting it
			 */
			const target = (ecma) => ({ compress: { ecma }, ecma, mangle: false });
			/** @type {[string, import("terser").MinifyOptions][]} */
			const cases = [
				["function f(a, b) { a || (a = b); return a; } console.log(f(0, 1), f(2, 3));", target(2020)],
				["function f(c) { return [null == c ? void 0 : c.a]; } console.log(f(null), f({ a: 1 }));", target(2019)],
				["function f(c) { return [null === c ? void 0 : c.a]; } console.log(f(null), f({ a: 1 }));", target(2021)],
				["function f(c) { return null == c ? null : c.a; } console.log(f(null), f({ a: 1 }));", target(2021)],
				["function f(a) { return \"\".concat(a, \"-x\"); } console.log(f(1));", target(5)],
				["function f(a, b) { return [a.concat(b), \"``````\".concat(b)]; } console.log(f([1], 2));", target(2015)],
				["function f(a) { try { return \"x`\".concat(a)`y`; } catch (e) { return e.name; } } console.log(f(1));", target(2015)],
				["var log = []; function o(n) { return { toString() { log.push(n); return n; } }; } function f(a, b) { return [\"\".concat(a, b), \"\".concat(a, \"-\", b), \"\".concat(...a)]; } console.log(f(o(\"a\"), o(\"b\")), f([1], 2), log.join());", target(2015)],
				["function f(a, b) { return Math.pow(a, 3); } console.log(f(2));", target(2015)],
				["function f(a, b) { return [Math.pow(a, b), Math.pow(2, 3)]; } console.log(f(2, 3));", target(2016)],
				["function f(Math, a) { return Math.pow(a, 3); } console.log(f({ pow: (a, b) => a + b }, 2));", target(2016)],
				["console.log(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.EPSILON);", target(2015)],
				["function f(Number) { return Number.MAX_SAFE_INTEGER; } console.log(f({ MAX_SAFE_INTEGER: 1 }));", target(2016)],
				["function f(o) { with (o) return Number.EPSILON; } console.log(f({ Number: { EPSILON: 1 } }));", target(2016)],
				["console.log(delete Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER++, Number?.EPSILON);", target(2020)],
				["function f(c) { return [null == c.d ? void 0 : c.d.e]; } console.log(f({}), f({ d: { e: 1 } }));", target(2021)],
				["function f(c) { return [null == c ? void 0 : g(c)]; } function g(c) { return c; } console.log(f(null), f(1), g(2));", target(2021)],
				["function f(c) { return [null == c ? void 0 : (c || g).a]; } function g() {} console.log(f(null), f({ a: 1 }));", target(2021)],
				["function f(c) { return [null == c ? void 0 : c?.a]; } console.log(f(null), f({ a: 1 }));", target(2021)],
				["var o = { p: 0, q: 1 }; function f(k) { o[k + 1] || (o[k + 1] = 2); return o; } console.log(f(\"p\"), f(\"q\"));", target(2021)],
				["var g = function f() { \"use strict\"; try { f = f || 1; } catch (e) { return e.name; } return typeof f; }; console.log(g());", target(2021)],
				["x = x || 1; var x; print(x); function print(v) { console.log(v); }", target(2021)],
				["console.log(function () { var other = {}, o = { get p() { o = other; return 0; }, set p(v) {} }, first = o; o.p || (o.p = 1); return [first === o, other.p]; }());", target(2021)],
				["var n = 0; Object.defineProperty(globalThis, \"a\", { get: function () { return n++ ? null : { p: 1 }; }, configurable: true }); function f() { return [null == a ? void 0 : a.p]; } try { console.log(f()); } catch (e) { console.log(e.name); }", target(2021)],
				["function f(o, c) { with (o) { return [null == c ? void 0 : c.p]; } } console.log(f({}, null), f({ c: { p: 2 } }, { p: 1 }));", target(2021)],
				["function f(o, c) { with (o) { c || (c = 1); return c; } } console.log(f({}, 0), f({ c: 0 }, 2));", target(2021)],
				["function f(a, b) { a || (b(), a = 1); return a; } console.log(f(0, function () {}));", target(2020)],
				["function f(o, c) { with (o) { c || (g(), c = 1); return c; } } function g() {} console.log(f({}, 0), f({ c: 0 }, 2));", target(2021)],
				["var first = { p: 0 }, other = { p: 0 }, o = first; function f() { o.p || (o = other, o.p = 1); return [first.p, other.p]; } console.log(f());", target(2021)],
				["function f(a, b) { a || (b(), a = 1, b()); return a; } console.log(f(0, function () {}));", target(2021)],
				["function f(a, b, c) { a || (b(), c = 1); return [a, c]; } console.log(f(0, function () {}));", target(2021)],
				["function f(c) { return null != c ? c : 1; } console.log(f(null), f(0));", target(2019)],
				["function f(c) { return [null != c.d ? c.d : 1, null != c ? c.d : 2]; } console.log(f({}), f({ d: 0 }));", target(2021)],
				["var n = 0; Object.defineProperty(globalThis, \"b\", { get: function () { return n++ ? null : 1; }, configurable: true }); function f() { return null != b ? b : 2; } console.log(f());", target(2021)],
				["function f(o, c) { with (o) { return null != c ? c : 1; } } console.log(f({}, null), f({ c: 2 }, 3));", target(2021)],
				["function f(c, d) { return [-c == d ? 1 : d, void g(d) == d ? 2 : d]; } function g() {} console.log(f(1, -1), f(1, null));", target(2021)],
				["function f(o, k) { o[k] || (o[k] = 1); return o; } var n = 0; console.log(JSON.stringify(f({}, { toString: function () { return \"k\" + n++; } })));", target(2021)],
				["var o = { m(k) { this[k] || (this[k] = 1); this.a.b || (this.a.b = 2); return this; }, a: {} }, n = 0; console.log(JSON.stringify(o.m({ toString: function () { return \"k\" + n++; } })));", target(2021)],
				["var o = { m() { this.p || (this.p = 1); return this.p; } }; console.log(o.m());", target(2020)],
				["function f(a, b) { null == a && b(); } f(null, console.log);", target(2019)],
				["function f(a, b) { return null == a && b(); } console.log(f(1, console.log));", target(2021)],
				["function f(a, b) { null === a && b(1); null != a && b(2); null == a || b(3); 0 == a && b(4); void g() == a && b(5); a && b(6); } function g() {} f(null, console.log);", target(2021)],
				["function f() { for (var n = arguments.length, a = Array(n), k = 0; k < n; k++) a[k] = arguments[k]; return a; } console.log(f(1, 2));", target(5)],
				["function f() { for (var n = arguments.length, a = Array(n), k = 0; k < n; k++) a[k] = arguments[k]; return [a, n, k]; } console.log(f(1, 2));", target(2015)],
				["function f() { arguments.length = 1; for (var n = arguments.length, a = Array(n), k = 0; k < n; k++) a[k] = arguments[k]; return a; } console.log(f(1, 2));", target(2015)],
				["function f() { for (var n = arguments.length, a = Array(n), k = 0; k < n; k++) a[k] = arguments[k]; return [a, arguments.length]; } console.log(f(1, 2));", target(2015)],
				["function f(Array) { for (var n = arguments.length, a = Array(n), k = 0; k < n; k++) a[k] = arguments[k]; return a; } console.log(f((n) => [n]));", target(2015)],
				["function f(o) { with (o) { for (var n = arguments.length, a = Array(n), k = 0; k < n; k++) a[k] = arguments[k]; } return a; } console.log(f({}));", target(2015)],
				["function f() { l: for (var n = arguments.length, a = Array(n), k = 0; k < n; k++) a[k] = arguments[k]; return a; } console.log(f(1, 2));", target(2015)],
				["function f() { var n; for (var n = arguments.length, a = Array(n), k = 0; k < n; k++) a[k] = arguments[k]; return a; } console.log(f(1, 2));", target(2015)],
				["function f() { for (var n = arguments.length, a = Array(n), k = 0, z = 1; k < n; k++) a[k] = arguments[k] + z; return a; } console.log(f(1, 2));", target(2015)],
				["function f() { for (var n = arguments.length, a = Array(n), k = 0; k < n; k++) a[k] = arguments[k] + 1; for (var m = arguments.length, b = Array(m), j = 0; j <= m; j++) b[j] = arguments[j]; for (var p = arguments.length, c = Array(p), i = 1; i < p; i++) c[i - 1] = arguments[i]; for (var q = arguments.length, d = Array(q > 1 ? q - 1 : 0), h = 1; h < q; h++) d[h - 2] = arguments[h]; return [a, b, c, d]; } console.log(f(1, 2));", target(2015)],
				["var g = () => { for (var n = arguments.length, a = Array(n), k = 0; k < n; k++) a[k] = arguments[k]; return a; }; try { console.log(g(1)); } catch (e) { console.log(e.name); }", target(2015)]
			];
			for (const [input, options] of cases) {
				const { code } = await minify(input, options);
				const reference = await terserReference().minify(input, options);
				expect(code).toBe(reference.code);
			}
		});

		it("should keep a pattern's names and a `catch` binding where dropping them changes what runs", async () => {
			const { minify } = await load();
			/** @type {import("terser").MinifyOptions} */
			const modern = { compress: { ecma: 2020 }, ecma: 2020, mangle: false };
			/** @type {[string, import("terser").MinifyOptions][]} */
			const cases = [
				["try { null.p; } catch (e) { console.log(1); }", { compress: {}, mangle: false }],
				["try { throw 1; } catch (e) { console.log(e); }", modern],
				['try { throw 1; } catch (e) { var e = 2; console.log(e); }', modern],
				["var e = 0; try { throw 1; } catch (e) { var e = 2; } console.log(e);", modern],
				["var e = 0; try { throw 1; } catch (e) { e = 2; } console.log(e);", modern],
				["console.log(function () { var o = Math.random() < 2 ? { a: 1, b: 2 } : {}; let { a, ...r } = o; return r.b; }());", modern],
				["console.log(function () { let { a = console.log(1) } = {}; return 2; }());", modern],
				["console.log(function () { let { [console.log(1)]: a } = {}; return 2; }());", modern],
				['console.log(function (k) { let { [k]: a } = {}; return 2; }({ toString() { console.log(1); return "a"; } }));', modern],
				["console.log(function () { var o = Math.random() < 2 ? { a: 1, b: 2 } : {}; let { a, b } = o; return a; }());", modern],
				['console.log(function () { let { a, b } = { a: 1, get b() { console.log(2); } }; return a; }());', modern],
				["console.log(function (o) { let [a, b] = o; return a; }(Math.random() < 2 ? [1, 2] : []));", modern],
				['console.log(function () { var it = { [Symbol.iterator]() { console.log("iterated"); return [][Symbol.iterator](); } }; let [] = [...it]; let { a } = { ...it }; let [] = [[...it]]; let {} = { d: { ...it }, e: 1 }; return 2; }());', modern],
				["console.log(function (s) { try { let { a = Math.abs(s) } = {}; } catch (e) { return e.name; } return 2; }(Symbol()));", modern],
				["class B {} class C extends B { constructor() { let { a = this } = {}; super(); } } try { new C(); } catch (e) { console.log(e.name); }", modern]
			];
			for (let [input, options] of cases) {
				const { code } = await minify(input, options);
				const reference = await terserReference().minify(input, options);
				expect(code).toBe(reference.code);
			}
		});

		it("should keep a `const` something writes, an `eval` reaches or the top level declares", async () => {
			const { minify } = await load();
			const options = { compress: {}, mangle: false };
			const cases = [
				"function f(o) { const a = o.x; try { a = 2; } catch (e) { console.log(e.name); } return a; } console.log(f({ x: 1 }));",
				"function f(o) { const a = o.x; try { a++; } catch (e) { console.log(e.name); } return a; } console.log(f({ x: 1 }));",
				"function f(o) { const a = o.x; try { [, a] = [1, 2]; } catch (e) { console.log(e.name); } return a; } console.log(f({ x: 1 }));",
				"function f(o) { const a = o.x; try { ({ b: a } = { b: 2 }); } catch (e) { console.log(e.name); } return a; } console.log(f({ x: 1 }));",
				"function f(o) { const a = o.x; try { for (a in o); } catch (e) { console.log(e.name); } return a; } console.log(f({ x: 1 }));",
				"function f(o) { const a = o.x; try { eval(\"a = 2\"); } catch (e) { console.log(e.name); } return a; } console.log(f({ x: 1 }));",
				"const a = Math.random() < 2; console.log(a, a);"
			];
			for (const input of cases) {
				const { code } = await minify(input, options);
				const reference = await terserReference().minify(input, options);
				expect(code).toBe(reference.code);
			}
		});

		it("should leave `let` declarations apart under `join_vars: false`", async () => {
			const { minify } = await load();
			const { code } = await minify(
				"function f(o) { const a = o.x; let b = o.y; b++; return [a, b]; } console.log(f({ x: 1, y: 2 }));",
				{ compress: { join_vars: false }, mangle: false }
			);
			expect(code).toBe(
				"function f(o){let a=o.x;let b=o.y;return b++,[a,b]}console.log(f({x:1,y:2}));"
			);
		});

		it("should keep a comment before a joined `let`, printed where terser prints one before a joined `var`", async () => {
			const { minify } = await load();
			/** @type {import("terser").MinifyOptions} */
			const options = {
				compress: {},
				mangle: false,
				format: { comments: "some" }
			};
			const { code } = await minify(
				"function f(o) { let a = o.x; /*! b */ const b = g(); a++; return [a, b, b]; }",
				options
			);
			expect(code).toBe(
				"function f(o){let a=o.x,b=g();/*! b */return a++,[a,b,b]}"
			);
			const joinedVars = await terserReference().minify(
				"function f(o) { var a = o.x; /*! b */ var b = g(); a++; return [a, b, b]; }",
				options
			);
			expect(joinedVars.code).toBe(
				"function f(o){var a=o.x,b=g();/*! b */return[++a,b,b]}"
			);
		});

		it("should leave the program's value alone under `expression`", async () => {
			const { minify } = await load();
			const input = `!function () { ${TRY} console.log(2); }();`;
			const options = { compress: { expression: true }, mangle: false };
			const { code } = await minify(input, options);
			const reference = await terserReference().minify(input, options);
			expect(code).toBe(reference.code);
		});

		it("should drop each `typeof` guard of a read, strict and loose alike", async () => {
			const { minify } = await load();
			for (const guard of [
				'typeof y != "undefined" && y',
				'typeof y !== "undefined" && y',
				'typeof y == "undefined" || y',
				'typeof y === "undefined" || y',
				'"undefined" != typeof y && y',
				'typeof y < "u" && y',
				'typeof y == "undefined" ? 0 : y'
			]) {
				const { code } = await minify(`${guard}; console.log(1);`, {
					compress: {},
					mangle: false
				});
				expect(code).toBe("console.log(1);");
			}
		});

		it("should leave built-in calls alone without `evaluate`", async () => {
			const { minify } = await load();
			const input = "console.log(Math.abs(-3));";
			const options = { compress: { evaluate: false }, mangle: false };
			const { code } = await minify(input, options);
			const reference = await terserReference().minify(input, options);
			expect(code).toBe(reference.code);
		});

		it("should leave the calls alone without `inline`", async () => {
			const { minify } = await load();
			const input = `!function () { ${TRY} console.log(2); }();`;
			const options = { compress: { inline: false }, mangle: false };
			const { code } = await minify(input, options);
			const reference = await terserReference().minify(input, options);
			expect(code).toBe(reference.code);
		});
	});

	describe("printEstree", () => {
		/**
		 * Runs a minify with the `correct` and `improve` phases off, so that it
		 * writes what terser writes.
		 * @template T
		 * @param {() => Promise<T>} run the minify
		 * @returns {Promise<T>} its result
		 */
		const writingAsTerser = async (run) => {
			const { corrections, improvements } = await load();
			if (!corrections || !improvements) {
				throw new Error("the correct and improve phases are not installed");
			}
			corrections.enabled = false;
			improvements.enabled = false;
			try {
				return await run();
			} finally {
				corrections.enabled = true;
				improvements.enabled = true;
			}
		};

		/**
		 * terser's result, or what it throws where it refuses what webpack reads.
		 * @param {() => Promise<EXPECTED_ANY>} run terser's minify
		 * @returns {Promise<EXPECTED_ANY>} its result, or `{ refused }` with the error's message
		 */
		const terserResult = async (run) => {
			try {
				return await run();
			} catch (err) {
				return { refused: /** @type {Error} */ (err).message };
			}
		};

		/**
		 * @param {EXPECTED_ANY} format format options
		 * @returns {EXPECTED_ANY} the same without the layout the printer ignores, for terser
		 */
		const withoutLayout = (format) => {
			const result = { ...format };
			for (const name of IGNORED_FORMAT_OPTIONS) delete result[name];
			return result;
		};

		/**
		 * Each expression statement in a source's tree, and its expression, as
		 * `printToString` prints it and as terser's own printer does in its tree.
		 * Where the trees differ, as where terser refuses the source, it lists all.
		 * @param {string} source a source
		 * @param {EXPECTED_ANY} options what to minify it with
		 * @returns {Promise<{ compared: number, differences: string[] }>} how many printed, and every one printed otherwise
		 */
		const compareExpressions = async (source, options) => {
			const { minify, modules } = await load();
			const terser = await loadTerserSources(importTerserSource);
			const withTree = () => ({
				...JSON.parse(JSON.stringify(options)),
				format: { ast: true, code: false }
			});
			// terser's typings leave out `format.ast`, which returns the tree.
			const ours = /** @type {EXPECTED_ANY} */ (
				await writingAsTerser(() => minify(source, withTree()))
			);
			const theirs = await terserResult(() => terser.minify(source, withTree()));
			/**
			 * @param {EXPECTED_ANY} tree a toplevel
			 * @param {(tree: EXPECTED_ANY, visit: (node: EXPECTED_ANY) => void) => void} walk the walk of its tree's classes
			 * @returns {EXPECTED_ANY[]} its expression statements, each followed by its expression
			 */
			const collect = (tree, walk) => {
				/** @type {EXPECTED_ANY[]} */
				const expressions = [];
				walk(tree, (node) => {
					// terser's statement holds `body`, webpack's ESTree's `expression`.
					if (kindName(node) === "SimpleStatement") {
						expressions.push(node, node.expression || node.body);
					}
				});
				return expressions;
			};
			const ourExpressions = collect(ours.ast, modules.ast.walk);
			const theirExpressions =
				theirs.refused === undefined ? collect(theirs.ast, terser.ast.walk) : [];
			let compared = 0;
			/** @type {string[]} */
			const differences = [];
			const paired = ourExpressions.length === theirExpressions.length;
			if (!paired) {
				differences.push(
					`terser reads ${theirExpressions.length} where webpack reads ${ourExpressions.length}${theirs.refused === undefined ? "" : `: ${theirs.refused}`}`
				);
			}
			for (const format of paired ? ESTREE_PRINT_FORMATS : []) {
				const given = { ...format, comments: false };
				for (const [i, expression] of ourExpressions.entries()) {
					const expected = theirExpressions[i].print_to_string(
						withoutLayout(given)
					);
					const printed = modules.printToString(
						expression,
						given,
						ours.ast.tokenTables
					);
					compared++;
					if (printed !== expected) {
						differences.push(
							`${JSON.stringify(format)}: ${expected} printed ${printed}`
						);
					}
				}
			}
			return { compared, differences };
		};

		const scripts = [...TABLE_SOURCES, ...ESTREE_PRINT_CASES];
		const optionSets = [
			{ compress: false, mangle: false },
			{ compress: { passes: 2 }, mangle: true }
		];
		for (const source of [...scripts, ...ESTREE_PRINT_MODULE_CASES]) {
			it(`should print each expression as terser does: ${source.slice(0, 60)}`, async () => {
				const module = ESTREE_PRINT_MODULE_CASES.includes(source);
				let compared = 0;
				/** @type {string[]} */
				const differences = [];
				for (const options of optionSets) {
					let result;
					try {
						result = await compareExpressions(source, { ...options, module });
					} catch (err) {
						// A table's source may be one only a module reads, or none.
						if (/** @type {Error} */ (err).name === "SyntaxError") continue;
						throw err;
					}
					differences.push(...result.differences);
					compared += result.compared;
				}
				if (ESTREE_PRINT_CASES.includes(source) || module) {
					expect(compared).toBeGreaterThan(0);
				}
				// Where webpack reads a source otherwise than terser, its own output.
				expect(differences).toMatchSnapshot();
			});
		}

		it("should refuse a node it cannot print yet", async () => {
			const { modules } = await load();
			const output = modules.output.OutputStream({});
			expect(() =>
				modules.printEstree(
					{ type: "Unknown", startToken: null, endToken: null },
					output
				)
			).toThrow("printEstree cannot print a Unknown node yet");
		});

		/**
		 * A source minified by `minify` and by terser, under each format.
		 * @param {string} source a source
		 * @param {EXPECTED_ANY} options what to minify it with
		 * @returns {Promise<string[]>} every format printed otherwise
		 */
		const compareProgram = async (source, options) => {
			const { minify } = await load();
			/** @type {string[]} */
			const differences = [];
			for (const format of ESTREE_PRINT_PROGRAM_FORMATS) {
				const given = () => ({
					...JSON.parse(JSON.stringify(options)),
					format: { ...format, comments: false }
				});
				const ours = await writingAsTerser(() => minify(source, given()));
				const theirs = await terserResult(() =>
					terserReference().minify(source, {
						...given(),
						format: withoutLayout({ ...format, comments: false })
					})
				);
				if (ours.code !== theirs.code) {
					differences.push(
						`${JSON.stringify(format)}: ${theirs.refused || theirs.code} printed ${ours.code}`
					);
				}
			}
			return differences;
		};

		const programOptionSets = [
			{ compress: false, mangle: false },
			{ compress: false, mangle: true },
			{ compress: { passes: 2 }, mangle: true },
			{ compress: { passes: 2 }, mangle: { toplevel: true }, toplevel: true }
		];
		const programSources = [
			...TABLE_SOURCES,
			...ESTREE_PRINT_CASES,
			...ESTREE_PRINT_STATEMENT_CASES
		];
		for (const source of [
			...programSources,
			...ESTREE_PRINT_MODULE_CASES,
			...ESTREE_PRINT_MODULE_STATEMENT_CASES
		]) {
			it(`should print the whole program as terser does: ${source.slice(0, 60)}`, async () => {
				let compared = 0;
				/** @type {string[]} */
				const differences = [];
				for (const module of [false, true]) {
					for (const options of programOptionSets) {
						try {
							differences.push(
								...(await compareProgram(source, { ...options, module }))
							);
						} catch (err) {
							// A source may be one only a script, or only a module, reads.
							if (/** @type {Error} */ (err).name === "SyntaxError") continue;
							throw err;
						}
						compared++;
					}
				}
				expect(compared).toBeGreaterThan(0);
				// Where webpack reads a source otherwise than terser, its own output.
				expect(differences).toMatchSnapshot();
			});
		}

		it("should parenthesize a value with comments before it, as terser does", async () => {
			const { modules } = await load();
			const output = modules.output.OutputStream({});
			const argument = {
				type: "Identifier",
				name: "a",
				startToken: { comments_before: [{ type: "comment2", value: "x" }] },
				endToken: null
			};
			modules.printEstree(
				{ type: "ReturnStatement", argument, startToken: null, endToken: null },
				output
			);
			expect(output.get()).toBe("return(a)");
		});

		it("should brace a statement's body where it must be", async () => {
			const { modules } = await load();
			const output = modules.output.OutputStream({});
			const identifier = (/** @type {string} */ name) => ({
				type: "Identifier",
				name,
				startToken: null,
				endToken: null
			});
			modules.printEstree(
				{
					type: "IfStatement",
					test: identifier("a"),
					consequent: {
						type: "VariableDeclaration",
						kind: "let",
						declarations: [
							{
								type: "VariableDeclarator",
								id: identifier("b"),
								init: null,
								startToken: null,
								endToken: null
							}
						],
						startToken: null,
						endToken: null
					},
					alternate: {
						type: "ClassDeclaration",
						id: identifier("C"),
						superClass: null,
						body: { type: "ClassBody", body: [], startToken: null, endToken: null },
						startToken: null,
						endToken: null
					},
					startToken: null,
					endToken: null
				},
				output
			);
			expect(output.get()).toBe("if(a){let b}else{class C{}}");
			// What only the compressor leaves: an `if` with no `else` before one.
			const nested = modules.output.OutputStream({});
			modules.printEstree(
				{
					type: "IfStatement",
					test: identifier("a"),
					consequent: {
						type: "IfStatement",
						test: identifier("b"),
						consequent: {
							type: "ExpressionStatement",
							expression: identifier("c"),
							startToken: null,
							endToken: null
						},
						alternate: null,
						startToken: null,
						endToken: null
					},
					alternate: { type: "EmptyStatement", startToken: null, endToken: null },
					startToken: null,
					endToken: null
				},
				nested
			);
			expect(nested.get()).toBe("if(a){if(b)c}else;");
		});

		it("should drop a printed function's body under `_destroy_ast`", async () => {
			const { minify, modules } = await load();
			const { ast } = /** @type {EXPECTED_ANY} */ (
				await minify("function f(a) { a(); } x = (b) => { b(); }; y = (c) => c;", {
					compress: false,
					mangle: false,
					format: { ast: true, code: false }
				})
			);
			const tree = ast;
			const output = modules.output.OutputStream({ _destroy_ast: true });
			modules.printEstree(tree, output);
			expect(output.get()).toBe("function f(a){a()}x=b=>{b()};y=c=>c;");
			const [declaration, arrow] = tree.body;
			expect(declaration.body.body).toEqual([]);
			expect(declaration.params).toEqual([]);
			expect(arrow.expression.right.body.body).toEqual([]);
		});

		/**
		 * @param {EXPECTED_ANY} options minify options
		 * @returns {EXPECTED_ANY} a copy `minify` may write into, as it does a source map's
		 */
		const copyOptions = (options) => ({
			...options,
			format: { ...options.format },
			...(options.sourceMap ? { sourceMap: { ...options.sourceMap } } : {})
		});

		/**
		 * A source minified by terser, or what it throws, and by `minify`, writing
		 * as terser.
		 * @param {string | Record<string, string>} source a source, or files
		 * @param {EXPECTED_ANY} options what to minify it with
		 * @returns {Promise<{ theirs: EXPECTED_ANY, ours: EXPECTED_ANY }>} both results
		 */
		const minifyBothWays = async (source, options) => {
			const { minify } = await load();
			const referenceOptions = copyOptions(options);
			referenceOptions.format = withoutLayout(referenceOptions.format);
			const theirs = await terserResult(() =>
				terserReference().minify(source, referenceOptions)
			);
			const ours = await writingAsTerser(() =>
				minify(source, copyOptions(options))
			);
			return { theirs, ours };
		};

		/**
		 * @param {string} source a source
		 * @param {EXPECTED_ANY} options what to minify it with
		 * @returns {Promise<{ theirs: EXPECTED_ANY, ours: EXPECTED_ANY } | undefined>} both results, as a script or else a module, or none when neither parses
		 */
		const minifyScriptOrModule = async (source, options) => {
			for (const module of [false, true]) {
				try {
					return await minifyBothWays(source, { ...options, module });
				} catch (err) {
					if (/** @type {Error} */ (err).name !== "SyntaxError") throw err;
				}
			}
			return undefined;
		};

		// The comment options, past the table's: the default minimizer's callback,
		// annotations alone, and every kind compressed and mangled.
		/** @type {EXPECTED_ANY[]} */
		const commentOptionSets = [
			...OUTPUT_OPTIONS,
			{
				compress: { passes: 2 },
				mangle: true,
				format: {
					beautify: false,
					comments: (
						/** @type {unknown} */ node,
						/** @type {{ type: string, value: string }} */ comment
					) =>
						(comment.type === "comment2" || comment.type === "comment1") &&
						/@preserve|@lic|@cc_on|^\**!/i.test(comment.value)
				}
			},
			{
				compress: { passes: 2 },
				mangle: true,
				format: { preserve_annotations: true }
			},
			{
				compress: false,
				mangle: false,
				format: { comments: false, preserve_annotations: true }
			},
			{ compress: { passes: 2 }, mangle: true, format: { comments: "all" } },
			{ compress: {}, mangle: true, format: { comments: /kept|@lic/ } },
			{
				compress: false,
				mangle: false,
				format: { comments: "all", preamble: "/*! p */", semicolons: false }
			}
		];

		for (const source of [
			...programSources,
			...ESTREE_PRINT_MODULE_CASES,
			...ESTREE_PRINT_MODULE_STATEMENT_CASES,
			...ESTREE_PRINT_COMMENT_CASES
		]) {
			it(`should print the comments terser does: ${source.slice(0, 60)}`, async () => {
				let compared = 0;
				/** @type {string[]} */
				const differences = [];
				for (const [index, options] of commentOptionSets.entries()) {
					const result = await minifyScriptOrModule(source, options);
					if (result === undefined) continue;
					const { ours, theirs } = result;
					if (ours.code !== theirs.code) {
						differences.push(
							`set ${index}: ${theirs.refused || theirs.code} printed ${ours.code}`
						);
					}
					compared++;
				}
				expect(compared).toBeGreaterThan(0);
				// Where webpack reads a source otherwise than terser, its own output.
				expect(differences).toMatchSnapshot();
			});
		}

		/**
		 * The source map option sets, over a source and its printed form with that
		 * form's map, read as an object and inline.
		 * @param {string} source a source
		 * @param {{ code: string, map: EXPECTED_OBJECT }} printed the source minified with a map
		 * @returns {[string | Record<string, string>, EXPECTED_ANY][]} each input with its options
		 */
		const mapOptionSets = (source, printed) => [
			[
				{ "input.js": source },
				{ compress: false, mangle: false, sourceMap: { asObject: true } }
			],
			[
				{ "input.js": source },
				{
					compress: { passes: 2 },
					mangle: true,
					sourceMap: {
						includeSources: true,
						filename: "out.js",
						root: "src/",
						url: "inline"
					},
					format: { comments: "all" }
				}
			],
			[
				{ "input.js": source },
				{
					compress: false,
					mangle: false,
					sourceMap: { asObject: true },
					format: { comments: "some", preserve_annotations: true }
				}
			],
			[
				printed.code,
				{
					compress: false,
					mangle: true,
					sourceMap: { asObject: true, content: printed.map }
				}
			],
			[
				`${printed.code}\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(
					JSON.stringify(printed.map)
				).toString("base64")}`,
				{
					compress: {},
					mangle: true,
					sourceMap: { content: "inline", includeSources: true }
				}
			]
		];

		for (const source of [
			...programSources,
			...ESTREE_PRINT_MODULE_CASES,
			...ESTREE_PRINT_MODULE_STATEMENT_CASES,
			...ESTREE_PRINT_COMMENT_CASES
		]) {
			it(`should map as terser does: ${source.slice(0, 60)}`, async () => {
				const { minify } = await load();
				let compared = 0;
				/** @type {string[]} */
				const differences = [];
				for (const module of [false, true]) {
					let printed;
					try {
						printed = await minify(source, {
							module,
							compress: false,
							mangle: { toplevel: true },
							sourceMap: { asObject: true }
						});
					} catch (err) {
						// A source may be one only a script, or only a module, reads.
						if (/** @type {Error} */ (err).name === "SyntaxError") continue;
						throw err;
					}
					for (const [index, [input, options]] of mapOptionSets(
						source,
						/** @type {EXPECTED_ANY} */ (printed)
					).entries()) {
						const { theirs, ours } = await minifyBothWays(input, {
							...options,
							module
						});
						for (const key of ["code", "map", "decoded_map"]) {
							const expected = JSON.stringify(theirs.refused || theirs[key]);
							const actual = JSON.stringify(ours[key]);
							if (actual !== expected) {
								differences.push(
									`set ${index} ${key}: ${expected} printed ${actual}`
								);
							}
						}
						compared++;
					}
					break;
				}
				expect(compared).toBeGreaterThan(0);
				// Where webpack reads a source otherwise than terser, its own output.
				expect(differences).toMatchSnapshot();
			});
		}

		it("should call the comments callback with the ESTree node", async () => {
			/** @type {string[]} */
			const types = [];
			const { minify } = await load();
			const ours = await minify("/*a*/ x(); function f() { /*b*/ return /*c*/ y; }", {
				compress: false,
				mangle: false,
				format: {
					comments: (
						/** @type {{ type: string }} */ node,
						/** @type {{ value: string }} */ comment
					) => {
						types.push(`${comment.value}:${node.type}`);
						return true;
					}
				}
			});
			expect(ours.code).toBe("/*a*/x();function f(){/*b*/ /*c*/return y}");
			expect(types).toEqual([
				"a:Program",
				"b:ReturnStatement",
				"c:ReturnStatement"
			]);
		});

		// Each runtime user of the printer: the frequency mangling orders names
		// by, `correct`'s `__proto__`, and what the compressor prints to compare.
		/** @type {[string, string, EXPECTED_ANY][]} */
		const PRINTER_USER_CASES = [
			[
				"the frequency",
				"function f(longName,other){var o={a:longName,b:other.c};return o.a+o.b+longName}f(1,{c:2});label:for(;;)break label;",
				{ compress: false, mangle: true }
			],
			[
				"private names",
				"class K{#secret=1;#m(){return this.#secret}static has(o){return #secret in o}run(){return this.#m()}}new K().run()",
				{ compress: false, mangle: true }
			],
			[
				"properties",
				'var o={alpha:1,beta:2,"gamma":3};o.alpha+o.beta+o.gamma+o["beta"]+o[x?"delta":"eps"]+o[(x,"zeta")];class Q{#pv;m(){return this.#pv}}',
				{ compress: false, mangle: { properties: { keep_quoted: true } } }
			],
			[
				"`__proto__`",
				'var p={},a={__proto__:p},b={__proto__},c={"__proto__":p};function g(__proto__){return{__proto__:__proto__}}console.log(a,b,c,g(1))',
				{ compress: false, mangle: true }
			],
			[
				"`Function`",
				"var f=Function(\"a\",\"b\",\"'use strict';return a+b\");f(1,2)",
				{ compress: { unsafe_Function: true }, mangle: true }
			],
			[
				"a function as a string",
				'console.log(""+function(){return 1})',
				{ compress: { unsafe: true }, mangle: false }
			],
			[
				"`pure_funcs`",
				"console.log(1);Math.floor(2);a.b.c(3)",
				{ compress: { pure_funcs: ["console.log", "a.b.c"] }, mangle: false }
			],
			[
				"`Object.defineProperty`",
				'var o={};Object.defineProperty(o,"x",{value:1});console.log(o.x)',
				{ compress: { passes: 2, unsafe: true }, mangle: false }
			],
			[
				"`spidermonkey`",
				'"use strict";var r=/a+/gi,n=1e3,s="x",b=10n;',
				{ compress: false, mangle: false, format: { spidermonkey: true } }
			]
		];
		for (const [name, source, options] of PRINTER_USER_CASES) {
			it(`should print for ${name} as terser does`, async () => {
				const { theirs, ours } = await minifyBothWays(source, options);
				expect(ours.code).toBe(theirs.code);
				expect(JSON.stringify(ours.ast)).toBe(JSON.stringify(theirs.ast));
			});
		}

		it("should drop a given tree's function bodies as terser does", async () => {
			const { minify, modules } = await load();
			const terser = await loadTerserSources(importTerserSource);
			const source = "function f(a){return()=>a}var g=function(b){return b};f(g)";
			for (const mangle of [false, true]) {
				/** @type {number[][]} */
				const lengths = [];
				for (const [minifier, walk] of [
					[minify, modules.ast.walk],
					[terser.minify, terser.ast.walk]
				]) {
					const { ast } = /** @type {EXPECTED_ANY} */ (
						await minifier(source, {
							compress: false,
							mangle: false,
							format: { ast: true, code: false }
						})
					);
					const { code } = await minifier(ast, { compress: false, mangle });
					expect(code).toMatch(/^function f\(/);
					/** @type {number[]} */
					const sizes = [];
					walk(ast, (/** @type {EXPECTED_ANY} */ node) => {
						if (node.argnames || node.params) {
							// webpack's function holds its statements in a block.
							sizes.push((Array.isArray(node.body) ? node.body : node.body.body).length);
						}
					});
					lengths.push(sizes);
				}
				expect(lengths[0]).toEqual(lengths[1]);
				expect(lengths[0]).toEqual([0, 0]);
			}
		});
	});

	describe("the compressed tree, as the printer reads it", () => {
		/**
		 * @param {string} source a script
		 * @param {EXPECTED_ANY} options what to minify it with
		 * @returns {Promise<EXPECTED_ANY>} terser's tree of it
		 */
		const terserTree = async (source, options) => {
			const { minify } = await load();
			// terser's typings leave out `format.ast`, which returns the tree.
			const { ast } = /** @type {EXPECTED_ANY} */ (
				await minify(source, {
					...options,
					format: { ast: true, code: false }
				})
			);
			return ast;
		};

		it("should keep a number's and a bigint's source", async () => {
			const tree = await terserTree("x = [1.0, 0x10, 1_000, .5, 12n, 0x1Fn];", {
				compress: false,
				mangle: false
			});
			const elements = tree.body[0].expression.right.elements;
			expect(
				elements.map((/** @type {EXPECTED_ANY} */ element) => element.raw)
			).toEqual(["1.0", "0x10", "1_000", ".5", "12n", "0x1Fn"]);
		});

		it("should read the quotes, names and source-map names the printer prints", async () => {
			const { modules } = await load();
			const tree = await terserTree(
				"var v = { 'a': 1, b: 2, [c]: 3, \"d\"() {} }; class K { 'e' = 1; #f = 2; [g] = 3 } import h from 'i' with { type: 'json' };",
				{ compress: false, mangle: true }
			);
			const declarator = tree.body[0].declarations[0];
			// A name is held as written and prints as its definition names it.
			const { definition } = declarator.id;
			expect(declarator.id.name).toBe("v");
			expect(modules.printToString(declarator.id)).toBe(
				definition.mangled_name || definition.name
			);
			const [a, b, c, d] = declarator.init.properties;
			expect([a.quote, modules.mapNameOf(a, tree.tokenTables)]).toEqual(["'", "a"]);
			expect([Boolean(b.quote), b.key.type, modules.mapNameOf(b, tree.tokenTables)]).toEqual([
				false,
				"Identifier",
				"b"
			]);
			expect([c.computed, modules.mapNameOf(c, tree.tokenTables)]).toEqual([true, "c"]);
			expect([d.method, d.quote]).toEqual([true, '"']);
			const [e, f, g] = tree.body[1].body.body;
			expect([e.type, e.quote, modules.mapNameOf(e, tree.tokenTables)]).toEqual([
				"PropertyDefinition",
				"'",
				"e"
			]);
			expect([f.key.type, modules.mapNameOf(f, tree.tokenTables)]).toEqual([
				"PrivateIdentifier",
				f.key.name
			]);
			expect([g.computed, modules.mapNameOf(g, tree.tokenTables)]).toEqual([true, "g"]);
			const [attribute] = tree.body[2].attributes.properties;
			expect([attribute.key.name, attribute.value.quote]).toEqual(["type", "'"]);
		});

		it("should print the nodes only the compressor makes, and refuse one it does not know", async () => {
			const { modules } = await load();
			const { ast } = modules;
			expect(
				[ast.NaNNode(), ast.UndefinedNode(), ast.InfinityNode()].map((node) =>
					modules.printToString(node)
				)
			).toEqual(["NaN", "undefined", "Infinity"]);
			expect(() => modules.printToString({ type: undefined })).toThrow(
				"printEstree cannot print a undefined node yet"
			);
		});

		/**
		 * @param {EXPECTED_ANY} modules the minifier's modules
		 * @param {EXPECTED_ANY} tree terser's tree
		 * @returns {string[]} where a kind of `kindOf` and terser's class disagree
		 */
		const kindDisagreements = (modules, tree) => {
			/** @type {string[]} */
			const disagreements = [];
			modules.ast.walk(tree, (/** @type {EXPECTED_ANY} */ node) => {
				for (const kind of Object.keys(modules.kindOf)) {
					// An Accessor, only ever a method's value, reads as a Function.
					if (kind === "Function" && kindName(node) === "Accessor") continue;
					// A try's blocks, never a statement of their own, read as statements.
					if (
						kind === "BlockStatement" &&
						(kindName(node) === "TryBlock" || kindName(node) === "Finally")
					) {
						continue;
					}
					const expected = modules.ast[`is${kind}Node`](node);
					if (modules.kindOf[kind](node) !== expected) {
						disagreements.push(`${kindName(node)} as ${node.type}: ${kind}`);
					}
				}
			});
			return disagreements;
		};

		for (const source of TABLE_SOURCES) {
			it(`should ask terser's kinds of a compressed and mangled tree: ${source.slice(0, 60)}`, async () => {
				const { modules } = await load();
				for (const tree of [
					await terserTree(source, { compress: false, mangle: false }),
					await terserTree(source, {
						compress: { passes: 2 },
						mangle: true,
						toplevel: true
					})
				]) {
					expect(kindDisagreements(modules, tree)).toEqual([]);
				}
			});
		}

		it("should print the names mangling chose, off their definitions", async () => {
			const { modules } = await load();
			const tree = await terserTree(MANGLED_NAMES, {
				compress: { passes: 2 },
				mangle: true
			});
			/** @type {[string, string][]} */
			const renamed = [];
			modules.ast.walk(tree, (/** @type {EXPECTED_ANY} */ node) => {
				const { definition } = node;
				if (node.type === "Identifier" && definition && definition.mangled_name) {
					const printed = modules.printToString(node);
					expect(printed).toBe(definition.mangled_name);
					renamed.push([node.name, printed]);
				}
			});
			expect(renamed).toContainEqual(["first", expect.any(String)]);
		});
	});

	describe("analyzeManglingScopes", () => {
		// The symbol classes terser declares with, as the analysis codes them.
		/** @type {Record<string, number>} */
		const DECLARING_KINDS = {
			SymbolVar: 1,
			SymbolFunarg: 2,
			SymbolLet: 3,
			SymbolConst: 4,
			SymbolUsing: 5,
			SymbolCatch: 6,
			SymbolImport: 7,
			SymbolDefun: 8,
			SymbolLambda: 9,
			SymbolClass: 10,
			SymbolDefClass: 11,
			SymbolRef: 12,
			SymbolExport: 12
		};

		/**
		 * @param {EXPECTED_ANY} analysis what `analyzeManglingScopes` answered
		 * @returns {EXPECTED_ANY[]} its scopes, in the order opened
		 */
		const scopesOf = (analysis) => {
			/** @type {EXPECTED_ANY[]} */
			const scopes = [];
			/**
			 * @param {EXPECTED_ANY} scope a scope
			 * @returns {void}
			 */
			const add = (scope) => {
				scopes.push(scope);
				for (const child of scope.childScopes) add(child);
			};
			add(analysis.toplevel);
			return scopes;
		};

		/**
		 * @param {EXPECTED_ANY} error what was thrown, if anything
		 * @returns {string | undefined} its message and where it points
		 */
		const errorOf = (error) =>
			error &&
			// Only a parse error has a `pos`: JavaScriptCore puts its own `line` on every error.
			`${error.message}${error.pos === undefined ? "" : ` at ${error.line}:${error.col}:${error.pos}`}`;

		/**
		 * terser's scope analysis and webpack's, each over the same tree: where
		 * the two disagree, as the mangler would read them.
		 * @param {EXPECTED_ANY} modules the minifier's modules
		 * @param {EXPECTED_ANY} tree terser's tree
		 * @param {EXPECTED_ANY} options the mangle options
		 * @returns {string[]} the disagreements
		 */
		const scopeDifferences = (modules, tree, options) => {
			const { ast } = modules;
			/** @type {string[]} */
			const differences = [];
			/** @type {EXPECTED_ANY} */
			let theirError;
			/** @type {EXPECTED_ANY} */
			let ourError;
			try {
				ast.figureOutScope(tree, options);
			} catch (error) {
				theirError = error;
			}
			// Both analyses write a name's `definition`: terser's is kept aside.
			/** @type {Map<EXPECTED_ANY, EXPECTED_ANY>} */
			const theirDefinitions = new Map();
			if (!theirError) {
				ast.walk(tree, (/** @type {EXPECTED_ANY} */ node) => {
					if (node.type === "Identifier" && node.atom !== true) {
						theirDefinitions.set(node, node.definition);
						if (node.definition) node.definition = null;
					}
				});
			}
			/** @type {EXPECTED_ANY} */
			let analysis;
			try {
				analysis = modules.analyzeManglingScopes(tree, options);
			} catch (error) {
				ourError = error;
			}
			if (theirError || ourError) {
				if (errorOf(theirError) !== errorOf(ourError)) {
					differences.push(`threw ${errorOf(theirError)}, ours ${errorOf(ourError)}`);
				}
				return differences;
			}
			/** @type {EXPECTED_ANY[]} */
			const theirScopes = [];
			/** @type {{ label: EXPECTED_ANY, parent: EXPECTED_ANY }[]} */
			const theirLabels = [];
			/** @type {EXPECTED_ANY[]} */
			const labelStack = [];
			/** @type {Set<EXPECTED_ANY>} */
			const theirBlockDefunScopes = new Set();
			/** @type {EXPECTED_ANY[]} */
			const theirDeclarators = [];
			// As terser's mangler walks: the scopes, labels and kept declarators.
			const walker = ast.createWalker(
				(/** @type {EXPECTED_ANY} */ node, /** @type {() => void} */ descend) => {
					if (ast.isLabeledStatementNode(node)) {
						theirLabels.push({
							label: node.label,
							parent: labelStack.length > 0 ? labelStack[labelStack.length - 1] : null
						});
						labelStack.push(node.label);
						descend();
						labelStack.pop();
						return true;
					}
					if (ast.isDefunNode(node) && !(ast.isScopeNode(walker.parent()))) {
						theirBlockDefunScopes.add(node.block_scope.upper.getDefunScope());
					}
					if (ast.isScopeNode(node) || ast.isBlockScope(node)) {
						theirScopes.push(node.block_scope);
					} else if (
						ast.isVarDefNode(node) &&
						ast.isSymbolNode(node.id) &&
						ast.isLambdaNode(node.init) &&
						!node.init.id
					) {
						theirDeclarators.push(node.id);
					}
				}
			);
			ast.walkNode(tree, walker);
			/** @type {EXPECTED_ANY[]} */
			const ourScopes = scopesOf(analysis);
			if (ourScopes.length !== theirScopes.length) {
				differences.push(`${ourScopes.length} scopes, terser ${theirScopes.length}`);
				return differences;
			}
			/** @type {Map<EXPECTED_ANY, EXPECTED_ANY>} */
			const scopeOf = new Map();
			/** @type {Map<EXPECTED_ANY, EXPECTED_ANY>} */
			const definitionOf = new Map();
			/**
			 * @param {EXPECTED_ANY} theirs terser's definition
			 * @param {EXPECTED_ANY} ours the analysis' definition
			 * @returns {void}
			 */
			const pairDefinitions = (theirs, ours) => {
				const known = definitionOf.get(theirs);
				if (known === undefined) definitionOf.set(theirs, ours);
				else if (known !== ours) differences.push(`${theirs.name} paired twice`);
			};
			for (const [index, theirs] of theirScopes.entries()) {
				const ours = ourScopes[index];
				const where = `scope ${index} (${ours.node.type})`;
				if (theirs.node !== ours.node) {
					differences.push(`${where} opened by another node`);
					return differences;
				}
				scopeOf.set(theirs, ours);
				const names = theirs.variables.map((/** @type {EXPECTED_ANY} */ variable) => variable.name);
				const ourNames = ours.variables.map((/** @type {EXPECTED_ANY} */ variable) => variable.name);
				if (names.join() !== ourNames.join()) {
					differences.push(`${where} declares ${ourNames}, terser ${names}`);
				}
				for (const name of names) {
					if (ours.getBinding(name) !== undefined) {
						pairDefinitions(theirs.getBinding(name), ours.getBinding(name));
					}
				}
			}
			// The bridge reads no name off `export *`, whose global terser makes.
			const theirGlobals = tree.globals;
			const star = theirGlobals.get("*");
			const globalNames = [...theirGlobals.keys()].filter((name) => name !== "*");
			if (globalNames.join() !== [...analysis.globals.keys()].join()) {
				differences.push(`globals ${[...analysis.globals.keys()]}, terser ${globalNames}`);
			}
			for (const name of globalNames) {
				if (analysis.globals.has(name)) {
					pairDefinitions(theirGlobals.get(name), analysis.globals.get(name));
				}
			}
			for (const [theirs, ours] of scopeOf) {
				const where = `scope ${ourScopes.indexOf(ours)} (${ours.node.type})`;
				if ((scopeOf.get(theirs.upper) || null) !== ours.upper) {
					differences.push(`${where} parent`);
				}
				if (scopeOf.get(theirs.getDefunScope()) !== ours.variableScope) {
					differences.push(`${where} defun`);
				}
				if (theirs.usesEval !== ours.usesEval) {
					differences.push(`${where} uses eval: ${ours.usesEval}`);
				}
				if (theirs.usesWith !== ours.usesWith) {
					differences.push(`${where} uses with: ${ours.usesWith}`);
				}
				const enclosed = theirs.enclosed
					.filter((/** @type {EXPECTED_ANY} */ definition) => definition !== star)
					.map((/** @type {EXPECTED_ANY} */ definition) => definitionOf.get(definition));
				if (
					enclosed.length !== ours.enclosed.length ||
					enclosed.some((/** @type {EXPECTED_ANY} */ definition, /** @type {number} */ index) => definition !== ours.enclosed[index])
				) {
					differences.push(
						`${where} encloses ${ours.enclosed.map((/** @type {EXPECTED_ANY} */ definition) => definition.name)}, terser ${theirs.enclosed.map((/** @type {EXPECTED_ANY} */ definition) => definition.name)}`
					);
				}
				const functionName =
					ast.isFunctionNode(theirs.node) && theirs.node.id
						? definitionOf.get(theirDefinitions.get(theirs.node.id))
						: null;
				if (functionName !== ours.functionName) {
					differences.push(`${where} function name`);
				}
			}
			for (const [theirs, ours] of definitionOf) {
				const where = `${theirs.name} in scope ${ourScopes.indexOf(ours.scope)}`;
				const kinds = theirs.identifiers.map((/** @type {EXPECTED_ANY} */ symbol) => DECLARING_KINDS[terserTypeOf(kindName(symbol))]);
				const declarations = kinds.reduce((/** @type {number} */ bits, /** @type {number} */ kind) => bits | (1 << kind), 0);
				if (kinds[0] !== ours.kind || declarations !== ours.declarations) {
					differences.push(`${where} declared as ${ours.kind}/${ours.declarations}, terser ${kinds}`);
				}
				for (const [field, theirValue, ourValue] of [
					["name", theirs.name, ours.name],
					["global", theirs.global, ours.global],
					["undeclared", theirs.undeclared, ours.undeclared],
					["export", theirs.export, ours.export],
					["scope", scopeOf.get(theirs.scope), ours.scope],
					[
						"unmangleable",
						Boolean(ast.isDefinitionUnmangleable(theirs, options)),
						modules.isUnmangleable(ours, options, null)
					]
				]) {
					if (theirValue !== ourValue) {
						differences.push(`${where} ${field}: ${ourValue}, terser ${theirValue}`);
					}
				}
			}
			/** @type {Map<EXPECTED_ANY, EXPECTED_ANY>} */
			const labelOf = new Map();
			if (theirLabels.length !== analysis.labels.length) {
				differences.push(`${analysis.labels.length} labels, terser ${theirLabels.length}`);
			}
			for (const [index, { label, parent }] of theirLabels.entries()) {
				const ours = analysis.labels[index];
				if (ours === undefined) break;
				labelOf.set(label, ours);
				if (label.name !== ours.name || (parent ? labelOf.get(parent) : null) !== ours.parent) {
					differences.push(`label ${index} (${ours.name})`);
				}
			}
			for (const [node, theirDefinition] of theirDefinitions) {
				let expected = null;
				if (ast.isLabelNode(node)) expected = labelOf.get(node);
				else if (ast.isLabelRefNode(node)) expected = labelOf.get(theirDefinition);
				else if (ast.isSymbolNode(node) && theirDefinition && theirDefinition !== star) {
					expected = definitionOf.get(theirDefinition);
				}
				if (expected !== (node.definition || null)) {
					differences.push(`${kindName(node)} ${node.name} names another definition`);
				}
			}
			const blockDefunScopes = [...theirBlockDefunScopes].map((scope) => scopeOf.get(scope));
			if (
				blockDefunScopes.length !== analysis.blockDefunScopes.size ||
				blockDefunScopes.some((scope) => !analysis.blockDefunScopes.has(scope))
			) {
				differences.push("block function scopes");
			}
			const declarators = options.keep_fnames
				? theirDeclarators
				: null;
			if (JSON.stringify(declarators && declarators.map((identifier) => identifier.name)) !== JSON.stringify(analysis.functionDeclarators && analysis.functionDeclarators.map((/** @type {EXPECTED_ANY} */ identifier) => identifier.name)) ||
				(declarators !== null && declarators.some((identifier, index) => identifier !== analysis.functionDeclarators[index]))) {
				differences.push("declarators naming a function");
			}
			return differences;
		};

		/** @type {Record<string, EXPECTED_OBJECT>} */
		const SCOPE_OPTION_SETS = {
			default: {},
			toplevel: { toplevel: true },
			module: { module: true, toplevel: true },
			ie8: { ie8: true },
			safari10: { safari10: true },
			"ie8 and safari10": { ie8: true, safari10: true },
			eval: { eval: true },
			"kept names": { keep_fnames: true, keep_classnames: true },
			"kept names by regexp": { keep_fnames: /^[a-m]/, keep_classnames: /^[n-z]/ }
		};

		/** @type {[string, string, boolean?][]} */
		const SCOPE_CASES = [
			[
				"a with before a block and after one",
				"function f(a) { { let b = a; } with (a) { c; } { let d = a; } } function g() { { let e; } }"
			],
			[
				"eval called, passed, constructed and read",
				"function f() { g(eval); } function h() { new eval(); } function i() { return eval; } function j() { eval?.(1); } function k() { import(eval); } function l() { { let m; eval('m'); } }"
			],
			[
				"catch parameters and the vars redeclaring them",
				"var e, x; try { a(); } catch (e) { var e = 1; e; } function f() { try { b(); } catch ({ x2, y: [z] }) { var x; z; x2; } try {} catch (w) { w; } return x; } try {} catch { c; }"
			],
			[
				"function declarations in blocks, sloppy and strict",
				"{ function a() {} } if (x) function b() {} c: function d() {} function e() { { function f() {} } switch (1) { case 1: function g() {} } } function h() { 'use strict'; { function i() {} } } class K { static { { function j() {} } } }"
			],
			[
				"function declarations in blocks of a module",
				"{ function a() {} } export function b() {} export default function c() {}",
				true
			],
			[
				"exports and imports",
				"import d, { e as f, 'g h' as i } from 'm'; import * as ns from 'n'; export { d, ns as n2 }; export { x as y } from 'o'; export { 'q r' as s } from 'p'; export * from 'q'; export * as t from 'r'; export const { u, v: [w], z = function () { var hidden; } } = d; export let [a1 = class Inner {}] = f; export var b1; { let c1; } export class C1 {} export default class D1 {}",
				true
			],
			["an anonymous default export", "export default function () { return d; } var d;", true],
			["a default exported class expression", "export default (class E {});", true],
			[
				"classes and their names",
				"class A extends B { static x = A; [k] = 1; #p = 2; m() { return A; } get n() { return this.#p; } static { var s = 1; t: for (;;) break t; } } var C = class D extends D2 { e = () => D; }; (class {});"
			],
			[
				"named function expressions and their parameters",
				"(function f(f, g) { return g; }); (function arguments() { return arguments; }); (function h(i = h) { return () => arguments; })"
			],
			[
				"nested labels",
				"a: { b: for (;;) { c: for (;;) { break a; } continue b; } } d: { function e() { f: g: while (1) break f; } }"
			],
			[
				"switch and loops",
				"switch (function () { return x; }) { case 1: let x = 1; default: x; } for (let i = 0; i < 1; i++) { let j = i; } for (const k in o) k; for (const [l, { m }] of o) l; for (n in o); for ([p, q = 1, ...r] of o); for (o.s in o); while (u) { let v; break; } do { let w; continue; } while (y);"
			],
			[
				"patterns, defaults and rest",
				"function f({ a, b: { c } = {}, [d]: e, ...g }, [h, , i = 2, ...j], k = h) { var l; ({ a, m: [n] } = g); [o.p, ...q] = j; } function r({ s = function () { var t; } }) {}"
			],
			[
				"catch parameters ie8 moves",
				"try {} catch (e) { e; } function f() { var e; try {} catch (e) { e; var e; } try {} catch (g) { (function () { g; }); } } (function () { try {} catch (a) {} })(function () { try {} catch (b) {} }); try {} catch (undeclared) {} undeclared;"
			],
			[
				"loops safari10 encloses",
				"var a, b; for (let i = 0; ; ) { let c; } for (const k in a) {} for (const v of b) {} function f(d) { for (;;) {} }"
			],
			[
				"declarators naming an anonymous function",
				"var a = function () {}, b = () => {}, c = function c() {}, { d } = function () {}, e = 1; let f = function () { var k = () => {}; }; const g = class {}; var h = function () {}, i; { using j = function () {}; }"
			],
			[
				"directives, arguments and strictness",
				"'use strict'; { function a() {} } function b() { return arguments; } var c = () => arguments; function d() { 'use strict'; return () => arguments; }"
			],
			[
				"templates, chains, members and spread",
				"a?.b(c)?.[d]; `${e}${f}` ; g`${h}`; new i(...j); k = { l, m: n, [o]: p, q() { return r; }, get s() { return t; }, ...u }; v in w; class X { #y; z(o) { return #y in o; } }"
			],
			["constants the compressor writes", "f(undefined, NaN, Infinity, void 0, 1 / 0, 0 / 0);"],
			[
				"a function and a class declared, inlined as expressions",
				"function f() { var a = []; function bar() {} a.map(bar); } function g() { class Foo {} return Foo.name; }"
			],
			[
				"a debugger, empty statements, yield and await",
				"function* a() { yield; yield b; debugger; ; } async function c() { await d; return; } (async () => { for await (const e of f) e; })(); function h() { return new.target; } this; throw g;"
			]
		];

		for (const [name, source, isModule] of SCOPE_CASES) {
			it(`should scope ${name} as terser does`, async () => {
				const { minify, modules } = await load();
				/** @type {string[]} */
				const differences = [];
				for (const compress of [false, { passes: 2, keep_fnames: true, keep_classnames: true }]) {
					for (const [setName, options] of Object.entries(SCOPE_OPTION_SETS)) {
						const { ast: tree } = /** @type {EXPECTED_ANY} */ (
							await minify(source, {
								compress,
								mangle: false,
								module: isModule,
								format: { ast: true, code: false }
							})
						);
						for (const difference of scopeDifferences(modules, tree, { ...options })) {
							differences.push(`${compress ? "compressed" : "parsed"}, ${setName}: ${difference}`);
						}
					}
				}
				expect(differences).toEqual([]);
			});
		}

		/**
		 * @param {EXPECTED_ANY} modules the minifier's modules
		 * @param {EXPECTED_ANY} tree terser's tree
		 * @param {string} type a symbol class
		 * @param {string} name a name
		 * @returns {EXPECTED_ANY} the first symbol of that class with that name
		 */
		const symbolOf = (modules, tree, type, name) => {
			/** @type {EXPECTED_ANY} */
			let found;
			modules.ast.walk(tree, (/** @type {EXPECTED_ANY} */ node) => {
				if (!found && kindName(node) === type && node.name === name) found = node;
			});
			return found;
		};

		/** @type {[string, boolean, (tree: EXPECTED_ANY, modules: EXPECTED_ANY) => void, string][]} */
		const SCOPE_ERRORS = [
			[
				"var a; let b;",
				false,
				(tree, modules) => {
					symbolOf(modules, tree, "SymbolLet", "b").name = "a";
				},
				'"a" is redeclared'
			],
			[
				"let a; var b;",
				false,
				(tree, modules) => {
					symbolOf(modules, tree, "SymbolVar", "b").name = "a";
				},
				'"a" is redeclared'
			],
			[
				"import x from 'm'; { y; }",
				true,
				(tree) => {
					tree.body[1].body.unshift(tree.body.shift());
				},
				'"Import" statement may only appear at the top level'
			],
			[
				"export const x = 1; { y; }",
				true,
				(tree) => {
					tree.body[1].body.unshift(tree.body.shift());
				},
				'"Export" statement may only appear at the top level'
			],
			[
				"a: b: ;",
				false,
				(tree) => {
					tree.body[0].body.label.name = "a";
				},
				"Label a defined twice"
			],
			[
				"a: for (;;) break a;",
				false,
				(tree, modules) => {
					symbolOf(modules, tree, "LabelRef", "a").name = "z";
				},
				"Undefined label z [1,18]"
			]
		];

		for (const [source, isModule, change, message] of SCOPE_ERRORS) {
			it(`should throw ${message} as terser does`, async () => {
				const { minify, modules } = await load();
				const { ast: tree } = /** @type {EXPECTED_ANY} */ (
					await minify(source, {
						compress: false,
						mangle: false,
						module: isModule,
						format: { ast: true, code: false }
					})
				);
				change(tree, modules);
				expect(() => modules.ast.figureOutScope(tree, {})).toThrow(message);
				expect(scopeDifferences(modules, tree, {})).toEqual([]);
			});
		}

		it("should read a name as declared where the compressor inlined its declaration", async () => {
			const { minify, modules } = await load();
			const { ast: tree } = /** @type {EXPECTED_ANY} */ (
				await minify(
					"function f() { function bar() {} a.map(bar); } function g() { class Foo {} return Foo; }",
					{
						compress: { keep_fnames: true, keep_classnames: true },
						mangle: false,
						format: { ast: true, code: false }
					}
				)
			);
			const program = tree;
			const analysis = modules.analyzeManglingScopes(program, {});
			const [f, g] = program.body;
			const inlined = [
				f.body.body[0].expression.arguments[0],
				g.body.body[0].argument
			];
			expect(inlined.map((/** @type {EXPECTED_ANY} */ node) => node.type)).toEqual([
				"FunctionExpression",
				"ClassExpression"
			]);
			// Declared in the function holding them, as the declarations were.
			expect(inlined.map((/** @type {EXPECTED_ANY} */ node) => node.id.definition.scope.node)).toEqual([f, g]);
			expect(scopesOf(analysis).find((/** @type {EXPECTED_ANY} */ scope) => scope.node === inlined[0]).functionName).toBe(inlined[0].id.definition);
		});

		it("should refuse a node it cannot read", async () => {
			const { modules } = await load();
			expect(() =>
				modules.analyzeManglingScopes(
					{ type: "Program", body: [{ type: "Unknown" }] },
					{}
				)
			).toThrow("The minifier's scope analysis cannot read a Unknown node");
		});

		it("should hold terser's scopes in webpack's scope model", async () => {
			const { minify, modules } = await load();
			const analyzeScope = require("../../lib/javascript/ScopeAnalyzer");
			const { ast: tree } = /** @type {EXPECTED_ANY} */ (
				await minify(
					"var a = function f(b) { { let c = b; } try {} catch (e) { let d = e; } return f; };",
					{ compress: false, mangle: false, format: { ast: true, code: false } }
				)
			);
			const { toplevel } = modules.analyzeManglingScopes(tree, {});
			expect(toplevel).toBeInstanceOf(analyzeScope.Scope);
			expect(toplevel.upper).toBeNull();
			expect(toplevel.getBinding("a")).toBeInstanceOf(analyzeScope.MinifierVariable);
			const [lambda] = toplevel.childScopes;
			// The function's own name and `arguments` sit in its scope, before its parameters.
			expect(lambda.variables.map((/** @type {EXPECTED_ANY} */ variable) => variable.name)).toEqual(["arguments", "f", "b"]);
			expect(lambda.functionName).toBe(lambda.getBinding("f"));
			expect(lambda.variableScope).toBe(lambda);
			// A scope for every block, even one declaring nothing, and a catch's,
			// whose body is no scope of its own.
			const [block, tryBlock, catchScope] = lambda.childScopes;
			expect(tryBlock.variables).toEqual([]);
			expect(block.variableScope).toBe(lambda);
			expect(block.variables.map((/** @type {EXPECTED_ANY} */ variable) => variable.name)).toEqual(["c"]);
			expect(catchScope.variables.map((/** @type {EXPECTED_ANY} */ variable) => variable.name)).toEqual(["e", "d"]);
			expect(catchScope.childScopes).toEqual([]);
			expect(block.enclosed).toContain(lambda.getBinding("b"));
		});

		it("should keep a kept declarator's name while mangling", async () => {
			const { minify, modules } = await load();
			const { ast: tree } = /** @type {EXPECTED_ANY} */ (
				await minify("var short = function () {}, other = () => {};", {
					compress: false,
					mangle: false,
					format: { ast: true, code: false }
				})
			);
			const options = { keep_fnames: /^s/, toplevel: true };
			const analysis = modules.analyzeManglingScopes(tree, options);
			const [short, other] = analysis.functionDeclarators.map(
				(/** @type {EXPECTED_ANY} */ identifier) => identifier.definition
			);
			const kept = new Set([short, other]);
			expect(modules.isUnmangleable(short, options, null)).toBe(false);
			expect(modules.isUnmangleable(short, options, kept)).toBe(true);
			expect(modules.isUnmangleable(other, options, kept)).toBe(false);
		});

		describe("mangleManglingScopes", () => {
			/**
			 * An identifier source ordering its names by the characters counted.
			 * @returns {EXPECTED_ANY} the source
			 */
			const sortingIdentifiers = () => {
				/** @type {string[]} */
				let characters = [];
				/** @type {Map<string, number>} */
				let counts = new Map();
				return {
					reset() {
						characters = [..."abcdefghijklmnopqrstuvwxyz"];
						counts = new Map();
					},
					/**
					 * @param {string} text characters printed
					 * @param {number} delta how to count them
					 */
					consider(text, delta) {
						for (const character of text) {
							counts.set(character, (counts.get(character) || 0) + delta);
						}
					},
					sort() {
						characters.sort(
							(first, second) =>
								(counts.get(second) || 0) - (counts.get(first) || 0) ||
								(first < second ? -1 : 1)
						);
					},
					/**
					 * @param {number} index which name
					 * @returns {string} the name
					 */
					get(index) {
						const alphabet = characters.length > 0 ? characters : [..."abcdefghijklmnopqrstuvwxyz"];
						let name = "";
						let rest = index + 1;
						do {
							rest--;
							name += alphabet[rest % 26];
							rest = Math.floor(rest / 26);
						} while (rest > 0);
						return name;
					}
				};
			};

			/**
			 * An identifier source ignoring frequency, handing out reserved words too.
			 * @returns {EXPECTED_ANY} the source
			 */
			const plainIdentifiers = () => ({
				/**
				 * @param {number} index which name
				 * @returns {string} the name
				 */
				get(index) {
					let name = "";
					let rest = index + 1;
					do {
						rest--;
						name += ["i", "f", "d", "o", "n", "a", "e", "l", "t", "r"][rest % 10];
						rest = Math.floor(rest / 10);
					} while (rest > 0);
					return name;
				}
			});

			/** @type {Record<string, () => EXPECTED_OBJECT>} */
			const MANGLE_OPTION_SETS = {
				default: () => ({ mangle: {} }),
				toplevel: () => ({ mangle: { toplevel: true } }),
				module: () => ({ mangle: { module: true } }),
				ie8: () => ({ mangle: { ie8: true } }),
				safari10: () => ({ mangle: { safari10: true } }),
				"ie8 and safari10": () => ({ mangle: { ie8: true, safari10: true, toplevel: true } }),
				eval: () => ({ mangle: { eval: true } }),
				"kept names": () => ({ mangle: { keep_fnames: true, keep_classnames: true } }),
				"kept names by a global regexp": () => ({
					mangle: { keep_fnames: /^[a-m]/g, keep_classnames: /[n-z]/g, toplevel: true }
				}),
				reserved: () => ({ mangle: { reserved: ["a", "b", "e", "t", "n", "r"], toplevel: true } }),
				"reserved names, the slow way": () => ({
					mangle: { reserved: ["a", "b", "e", "t", "n", "r"], safari10: true }
				}),
				"identifiers sorted by frequency": () => ({ mangle: { nth_identifier: sortingIdentifiers() } }),
				"identifiers ignoring frequency": () => ({
					mangle: { nth_identifier: plainIdentifiers(), toplevel: true }
				}),
				"a name cache": () => ({
					mangle: {},
					nameCache: { vars: { props: { $foo: "a", $console: "b", $f: "zz", $e: "t" } } }
				}),
				"a name cache at the top level": () => ({ mangle: { toplevel: true }, nameCache: {} }),
				"a name cache, kept names and ie8": () => ({
					mangle: { toplevel: true, keep_fnames: /^[a-f]/g, ie8: true },
					nameCache: { vars: { props: { $a: "n" } } }
				})
			};

			/**
			 * A source minified by terser and by webpack, which writes what terser
			 * writes with its `correct` and `improve` phases off.
			 * @param {string | Record<string, string>} input a source, or files
			 * @param {() => EXPECTED_ANY} makeOptions fresh options each time
			 * @returns {Promise<{ theirs: EXPECTED_ANY, ours: EXPECTED_ANY }>} code, maps and name cache each way
			 */
			const mangleBothWays = async (input, makeOptions) => {
				const { minify, corrections, improvements } = await load();
				/**
				 * @param {Minifying} minifier a `minify`
				 * @param {EXPECTED_ANY} options its options
				 * @returns {Promise<EXPECTED_ANY>} what it wrote
				 */
				const run = async (minifier, options) => {
					const result = /** @type {EXPECTED_ANY} */ (await minifier(input, options));
					return {
						code: result.code,
						map: result.map,
						decodedMap: result.decoded_map,
						nameCache: options.nameCache
					};
				};
				const theirs = await run(terserReference().minify, makeOptions());
				const phases = /** @type {{ enabled: boolean }[]} */ ([corrections, improvements]);
				for (const phase of phases) phase.enabled = false;
				try {
					return { theirs, ours: await run(minify, makeOptions()) };
				} finally {
					for (const phase of phases) phase.enabled = true;
				}
			};

			/**
			 * What webpack writes for a source under each mangle option set.
			 * @param {string} source the source
			 * @returns {Promise<string[]>} the code and name cache each set writes
			 */
			const ownOutputs = async (source) => {
				const { minify } = await load();
				/** @type {string[]} */
				const outputs = [];
				for (const [setName, makeSet] of Object.entries(MANGLE_OPTION_SETS)) {
					for (const compress of [false, { passes: 2 }]) {
						for (const module of [false, true]) {
							const options = /** @type {EXPECTED_ANY} */ ({ ...makeSet(), compress, module });
							try {
								const { code } = await minify(source, options);
								outputs.push(`${setName}, ${compress ? "compressed" : "parsed"}: ${code} ${JSON.stringify(options.nameCache)}`);
								break;
							} catch (err) {
								if (/** @type {Error} */ (err).name !== "SyntaxError") throw err;
							}
						}
					}
				}
				return outputs;
			};

			/**
			 * How webpack's mangling differs from terser's, read where the two print
			 * the source alike unmangled: their parsers place some nodes apart.
			 * @param {string | Record<string, string>} input a source, or files
			 * @param {() => EXPECTED_ANY} makeOptions fresh options each time
			 * @returns {Promise<string[]>} each result that differs, as webpack wrote it
			 */
			const mangleDifferences = async (input, makeOptions) => {
				const { theirs, ours } = await mangleBothWays(input, makeOptions);
				const unmangled = await mangleBothWays(input, () => ({ ...makeOptions(), mangle: false }));
				/** @type {string[]} */
				const differences = [];
				for (const key of ["code", "map", "decodedMap", "nameCache"]) {
					if (
						JSON.stringify(unmangled.theirs[key]) === JSON.stringify(unmangled.ours[key]) &&
						JSON.stringify(theirs[key]) !== JSON.stringify(ours[key])
					) {
						differences.push(`${key} ${JSON.stringify(ours[key])}`);
					}
				}
				return differences;
			};

			for (const source of [
				...TABLE_SOURCES,
				...SCOPE_CASES.map(([, scopeSource]) => scopeSource),
				"a: { b: for (;;) { c: if (x) break b; } d: e: while (y) { (function () { f: g: for (;;) continue f; })(); break d; } }",
				"function f(a, b) { var c = a + b; try { g(); } catch (e) { var e = 1; l: for (;;) { m: break l; } } return function h(x, y) { return x + y + c + h; }; } f(1, 2); var $foo = 1; foo; console.log(f);",
				"function outer() { if (a) { function inner(x) { return x; } inner(1); } var y = function named(z, w) { return named(z) + w; }; try {} catch (q) { var q; } return [, y, , outer]; } outer();",
				"switch (function () { var v = 'v'; try { throw 'e'; } catch (e) { console.log(v); } }()) { default: (function () { try {} catch (u) {} })(); } var b = 10; switch (function () { b; try {} catch (b) { var b; } }()) { default: (function () { try {} catch (u) {} })(); }",
				"function pick(first, second, third) { if (first) return /* a dropped note */ first + second; if (second) return /* another */ [second, third]; throw /* why */ new Error(third); } sink(pick);",
				"var reused = 1; function f() { var a1, a2, a3, a4, a5, a6, a7, a8, a9, b1, b2, b3, b4, b5, b6, b7, b8, b9, c1, c2, c3, c4, c5, c6, c7, c8, c9, d1, d2, d3, d4, d5, d6, d7, d8, d9, e1, e2, e3, e4, e5, e6, e7, e8, e9, f1, f2, f3, f4, f5, f6, f7, f8, f9; return [a1, a2, a3, a4, a5, a6, a7, a8, a9, b1, b2, b3, b4, b5, b6, b7, b8, b9, c1, c2, c3, c4, c5, c6, c7, c8, c9, d1, d2, d3, d4, d5, d6, d7, d8, d9, e1, e2, e3, e4, e5, e6, e7, e8, e9, f1, f2, f3, f4, f5, f6, f7, f8, f9, reused]; }"
			]) {
				it(`should mangle as terser's mangler does: ${source.slice(0, 60)}`, async () => {
					/** @type {string[]} */
					const differences = [];
					let compared = 0;
					for (const [setName, makeSet] of Object.entries(MANGLE_OPTION_SETS)) {
						for (const compress of [false, { passes: 2 }]) {
							for (const module of [false, true]) {
								/** @type {string[]} */
								let found;
								try {
									found = await mangleDifferences({ "input.js": source }, () => ({
										...makeSet(),
										compress,
										module,
										sourceMap: { asObject: true }
									}));
								} catch (err) {
									// A source may be one only a script, or only a module, reads.
									if (/** @type {Error} */ (err).name !== "SyntaxError") throw err;
									const terserRefuses = await terserReference()
										.minify({ "input.js": source }, { ...makeSet(), compress, module })
										.then(
											() => false,
											() => true
										);
									if (terserRefuses) continue;
									throw err;
								}
								for (const difference of found) {
									differences.push(`${setName}, ${compress ? "compressed" : "parsed"}, ${module ? "module" : "script"}: ${difference}`);
								}
								compared++;
								break;
							}
						}
					}
					if (compared === 0) {
						// terser refuses the source, so what webpack writes is held as written.
						expect(await ownOutputs(source)).toMatchSnapshot();
						return;
					}
					expect(differences).toEqual([]);
				});
			}

			it("should not name a parameter as its function, kept as declared, as terser's mangler does", async () => {
				const source =
					"function n(t) { return t + 1; } function e(n) { return n; } console.log([1].map(n), [2].map(e));";
				const { theirs, ours } = await mangleBothWays(source, () => ({
					compress: { keep_fnames: true, toplevel: true, passes: 2 },
					mangle: {}
				}));
				expect(theirs.code).toBe(
					"console.log([1].map(function n(o){return o+1}),[2].map(function e(n){return n}));"
				);
				expect(ours).toEqual(theirs);
			});

			it("should hand a name cache from one source to the next as terser's mangler does", async () => {
				const sources = [
					"var shared = 1, $kept = 2; function grow(by) { return shared + by; } grow(unknownGlobal);",
					"var other = shared, grown = grow(other); console.log(grown, $kept, unknownGlobal);"
				];
				const { minify } = await load();
				for (const mangle of [{ toplevel: true }, { toplevel: true, keep_fnames: true }, {}]) {
					/** @type {string[][]} */
					const outputs = [];
					/** @type {EXPECTED_ANY[]} */
					const caches = [];
					for (const minifier of [terserReference().minify, minify]) {
						const nameCache = {};
						const codes = [];
						for (const source of sources) {
							codes.push(
								/** @type {string} */ (
									(await minifier(source, { compress: false, mangle: { ...mangle }, nameCache })).code
								)
							);
						}
						outputs.push(codes);
						caches.push(nameCache);
					}
					expect(outputs[1]).toEqual(outputs[0]);
					expect(caches[1]).toEqual(caches[0]);
				}
			});

			/** @type {Record<string, () => EXPECTED_OBJECT>} */
			const PROPERTY_OPTION_SETS = {
				"private names alone": () => ({ mangle: {} }),
				properties: () => ({ mangle: { properties: {} } }),
				"properties at the top level": () => ({ mangle: { toplevel: true, properties: true } }),
				"properties by a regexp": () => ({ mangle: { properties: { regex: /^[a-m_$]/ } } }),
				"properties by a global regexp": () => ({ mangle: { properties: { regex: /^[a-q]/g } } }),
				"quoted properties kept": () => ({ mangle: { properties: { keep_quoted: true } } }),
				"quoted properties kept strictly": () => ({ mangle: { properties: { keep_quoted: "strict" } } }),
				"debug properties": () => ({ mangle: { properties: { debug: true } } }),
				"debug properties with a suffix": () => ({ mangle: { properties: { debug: "XYZ" } } }),
				"builtin properties": () => ({ mangle: { toplevel: true, properties: { builtins: true } } }),
				"undeclared properties": () => ({ mangle: { properties: { undeclared: true } } }),
				"annotated properties alone": () => ({ mangle: { properties: { only_annotated: true } } }),
				"reserved properties": () => ({ mangle: { properties: { reserved: ["foo", "p", "value"] } } }),
				"cached properties alone": () => ({
					mangle: { properties: { only_cache: true } },
					nameCache: { props: { props: { $foo: "a", $bar: "zz", $1: "one", $value: "v" } } }
				}),
				"a property name cache": () => ({
					mangle: { properties: {} },
					nameCache: { vars: { props: { $foo: "a" } }, props: { props: { $foo: "a", $1: "b", $length: "q" } } }
				}),
				"identifiers sorted by frequency": () => ({
					mangle: { nth_identifier: sortingIdentifiers(), properties: { nth_identifier: sortingIdentifiers() } }
				}),
				"identifiers ignoring frequency": () => ({ mangle: { nth_identifier: plainIdentifiers(), properties: {} } }),
				"properties and ie8": () => ({ mangle: { ie8: true, safari10: true, keep_fnames: true, properties: {} } })
			};

			for (const source of [
				"class A { #x = 1; #y() { return this.#x; } static #z; get #w() { return 1; } set #w(v) {} static { A.#z = 2; } m(o) { return #x in o && this.#y().#x?.#w; } } new A().m({});",
				"var o = { foo: 1, 'bar': 2, 3: 4, [baz]: 5, get qux() { return 1; }, set qux(v) {}, [k]() {}, *gen() {}, async am() {} }; o.foo = o['bar'] + o.qux + o[3]; Object.defineProperty(o, 'zed', {}); 'foo' in o; o[c ? 'a1' : (0, 'b1')]; console.log(o, window.beta, x.y.z, (await_ => 1)(), this.vee, (-u).neg, (n++).inc, new N().made, f().called, a?.b.chained, (a?.b).parenthesized);",
				"var { alpha: aa, gamma = 2, ...rest } = o, [{ delta }] = p; class C { constructor() {} static eps = 1; 'zeta' = 2; [zz] = 3; if = 4; 1 = 5; method() {} 'quoted'() {} } new C().eps; for (const { theta } of list) theta;",
				"function f(Object) { return Object.defineProperty(a, 'p', { value: 1 }); } var q = { p: 1, /*@__KEY__*/ 'r': 2, 'r2': /*@__KEY__*/ 'p' }; q[/*@__KEY__*/ 'r']; f({}); new Object.defineProperty(b, 'nu', {}); Object['defineProperty'](b, 'xi', {}); Object?.defineProperty(b, 'omicron', {}); Object.defineProperty?.(b, 'pi', {}); Object.defineProperty(b, ...rho); class Sigma { #tau = 1; get() { return this.#tau; } }",
				"var o = { if: 1, null: 2, 1e3: 3, 0x10: 4, 'a b': 5, [`t`]: 6, [function () {}]() {}, [() => 1]() {}, [class {}]() {}, [function named() {}]() {}, [class Named {}]() {}, [NaN]() {}, [void 0]() {}, [x.y]() {} }; o.if + o.null + o[1000] + o['a b'] + o[1];",
				"async function f(a) { return (await a).awaited + (typeof a).length; } function* g(b) { (yield).empty; (yield b).full; } l: for (var key in obj) { if (key.skip) continue l; break l; } f(g);",
				"var o = { ['computed']: 1, value: 2 }; Object.defineProperty(o, c ? 'cond1' : 'cond2', {}); o.foo.bar = 1; window.foo; foo.bar; new Foo().bar; export_ = { value: o.value };"
			]) {
				it(`should mangle properties and private names as terser's mangler does: ${source.slice(0, 60)}`, async () => {
					/** @type {string[]} */
					const differences = [];
					for (const [setName, makeSet] of Object.entries(PROPERTY_OPTION_SETS)) {
						for (const compress of [false, { passes: 2 }]) {
							const found = await mangleDifferences({ "input.js": source }, () => ({
								...makeSet(),
								compress,
								sourceMap: { asObject: true }
							}));
							for (const difference of found) {
								differences.push(`${setName}, ${compress ? "compressed" : "parsed"}: ${difference}`);
							}
						}
					}
					expect(differences).toEqual([]);
				});
			}

			it("should throw as terser's mangler does where `Object.defineProperty` has no descriptor name", async () => {
				const { minify } = await load();
				/** @type {string[]} */
				const messages = [];
				for (const minifier of [terserReference().minify, minify]) {
					try {
						await minifier("Object.defineProperty(o);", { mangle: { properties: {} } });
					} catch (err) {
						// JavaScriptCore quotes the failing expression, which differs between the two.
						const { name, message } = /** @type {Error} */ (err);
						messages.push(`${name} ${/\bwalk\b/.test(message)}`);
					}
				}
				expect(messages).toEqual(["TypeError true", "TypeError true"]);
			});

			it("should fill a name cache without printing as terser does", async () => {
				const { minify } = await load();
				/** @type {EXPECTED_ANY[]} */
				const caches = [];
				for (const minifier of /** @type {Minifying[]} */ ([terserReference().minify, minify])) {
					const nameCache = {};
					await minifier("function f(long) { return long; } f(1); var g = 2;", {
						mangle: { toplevel: true, properties: true },
						format: { code: false },
						nameCache
					});
					caches.push(nameCache);
				}
				expect(caches[1]).toEqual(caches[0]);
			});

			it("should drop a tree it was given once printed, as terser does", async () => {
				const { minify } = await load();
				const source = "function f(long) { return long; } f(1);";
				for (const [minifier, format] of /** @type {[Minifying, EXPECTED_OBJECT][]} */ ([
					[terserReference().minify, { spidermonkey: true }],
					[minify, { spidermonkey: true }],
					[minify, {}]
				])) {
					const { ast } = /** @type {EXPECTED_ANY} */ (
						await minifier(source, { compress: false, mangle: false, format: { ast: true, code: false } })
					);
					const { code } = await minifier(ast, { compress: false, mangle: { toplevel: true }, format });
					expect([code, (Array.isArray(ast.body[0].body) ? ast.body[0].body : ast.body[0].body.body).length, (ast.body[0].params || ast.body[0].argnames).length, ast.variables]).toEqual([
						"function n(n){return n}n(1);",
						0,
						0,
						undefined
					]);
				}
			});

			it("should hand the tree back mangled as terser does", async () => {
				const { minify } = await load();
				const source =
					"function f(long) { var o = { foo: 1, 'bar': 2, get baz() { return 3; }, [k]: 4 }; return long + o.foo + o['bar'] + o[/*@__KEY__*/ 'qux']; } class C { #x = 1; static y = 2; 'z' = 3; #w() {} m(p) { return #x in p && this.#x + this.#w(); } } l: for (;;) { f(1); break l; } new C();";
				for (const mangle of [{ toplevel: true }, { toplevel: true, properties: { keep_quoted: true } }, { properties: {} }]) {
					const options = () => /** @type {EXPECTED_ANY} */ ({ compress: false, mangle: { ...mangle }, format: { ast: true } });
					const theirs = /** @type {EXPECTED_ANY} */ (await terserReference().minify(source, options()));
					const ours = /** @type {EXPECTED_ANY} */ (await minify(source, options()));
					expect(ours.code).toBe(theirs.code);
					// Each tree, printed again without mangling, prints the names it took.
					const reprint = { compress: false, mangle: false };
					expect((await minify(ours.ast, reprint)).code).toBe(
						(await terserReference().minify(theirs.ast, reprint)).code
					);
					const estreeOptions = () =>
						/** @type {EXPECTED_ANY} */ ({ compress: false, mangle: { ...mangle }, format: { spidermonkey: true } });
					// Where the parsers place a node apart is no concern of mangling's.
					/**
					 * @param {EXPECTED_ANY} result a result
					 * @returns {string} its ESTree tree, without locations
					 */
					const estreeOf = (result) =>
						JSON.stringify(result.ast, (key, value) => (key === "loc" ? undefined : value));
					expect(estreeOf(await minify(source, estreeOptions()))).toBe(
						estreeOf(await terserReference().minify(source, estreeOptions()))
					);
				}
			});

			it("should mangle what a constant `new Function` body holds as terser does", async () => {
				const { minify } = await load();
				for (const source of [
					"var f = new Function('alpha', 'beta', 'var gamma = alpha + beta; return function inner(delta) { return gamma * delta; }'); console.log(f);",
					"var f = Function('alpha', '{ beta, gamma }', 'return (x => x + alpha + beta)(gamma)'); console.log(f);",
					// A body closing the function early: the first function terser's walk meets is taken.
					"var f = Function('a', '}); function g() { for (;;) s(); return [, s]; } (function () {'); console.log(f);"
				]) {
					const options = () => ({
						compress: { unsafe: true, unsafe_Function: true, unsafe_arrows: true, hoist_funs: true, passes: 2 },
						mangle: true,
						ecma: /** @type {const} */ (2020)
					});
					const ours = await minify(source, options());
					expect(ours.code).toBe((await terserReference().minify(source, options())).code);
				}
			});
		});
	});
});
