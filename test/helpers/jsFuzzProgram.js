"use strict";

// cspell:ignore aeiou gimsuyd NOINLINE xaby

// A seeded generator of JavaScript programs that print what they compute: the
// sloppy-mode ES5 terser's ufuzz writes (canaries, `arguments`, `delete`,
// labeled loops, IIFEs, setters) beside classes with private, static, computed
// and accessor members, generators, async functions and generators, `?.`, `??`,
// destructuring and spread; rarer syntax (`with`, direct `eval`, `new.target`,
// literal spellings, regular expressions, escaped names); modules importing and
// re-exporting `DEPENDENCY`; and bundles shaped as webpack writes them.

/**
 * @typedef {object} Binding
 * @property {string} name the name
 * @property {"var" | "let" | "const" | "param" | "function" | "class" | "generator" | "async" | "namespace" | "caught"} kind how it is bound
 */

/**
 * @typedef {object} Context
 * @property {Binding[]} bindings the names in scope, innermost last
 * @property {number} depth how deep in statements the generator is
 * @property {boolean} inFunction whether `return` is allowed
 * @property {boolean} inGenerator whether `yield` is allowed
 * @property {boolean} inAsync whether `await` is allowed
 * @property {boolean} inLoop whether `break` and `continue` are allowed
 * @property {boolean} inSwitch whether `break` is allowed
 * @property {boolean} inClass whether `this` is an instance
 * @property {boolean} strict whether the code is strict, as a class body is
 * @property {boolean} hasArguments whether `arguments` is a function's own
 * @property {boolean} hasNewTarget whether `new.target` may be read
 * @property {boolean} module whether the program is a module, which imports `dep`
 * @property {boolean} scopeTop whether statements are a function's or the program's own
 * @property {string[]} labels the labels in scope
 * @property {string[]} loopLabels the labels `continue` may name
 */

// Every function decrements `_calls_` first, so recursion and loops calling
// functions end; what is logged shows values only, never source text or names.
// `a`, `b` and `c` are ufuzz's canaries, printed last.
const PRELUDE = `var _calls_ = 60, a = 100, b = 10, c = 0;
Function.prototype.toString = function () {
	return typeof _functionText === "string" ? _functionText : "[function]";
};
function _show(v, d) {
	var t = typeof v;
	if (t === "function") return "[function]";
	if (t === "symbol") return "[symbol]";
	if (t === "bigint") return v + "n";
	if (t === "string") return JSON.stringify(v);
	if (t === "number" && v === 0 && 1 / v < 0) return "-0";
	if (v === null || t !== "object") return String(v);
	if (d > 1) return Array.isArray(v) ? "[array]" : "[object]";
	var out = [];
	if (Array.isArray(v)) {
		for (var i = 0; i < v.length; i++) out.push(i in v ? _show(v[i], d + 1) : "");
		return "[" + out.join(",") + "]";
	}
	var keys = Object.keys(v);
	for (var j = 0; j < keys.length; j++) out.push(keys[j] + ":" + _show(v[keys[j]], d + 1));
	return "{" + out.join(",") + "}";
}
function _error(e) {
	return e !== null && typeof e === "object" && typeof e.name === "string" ? "<" + e.name + ">" : _show(e, 0);
}
function _print() {
	var parts = [];
	try {
		for (var i = 0; i < arguments.length; i++) parts.push(_show(arguments[i], 0));
	} catch (e) {
		parts.push("!" + _error(e));
	}
	console.log(parts.join(" "));
}
function _pure(v) {
	return v;
}
function _tag(strings) {
	return strings.raw.join("|") + "/" + strings.join("|") + "/" + (arguments.length - 1);
}
`;

// The module every module program may import as `dep`: a live binding, a
// function changing it, a default class and an alias.
const DEPENDENCY = `export let counter = 0;
export function bump() { return ++counter; }
export default class Dep { m() { return counter; } }
export const list = [1, 2];
export const object = { a: 1, b: { c: 2 } };
export { counter as alias };
`;

const NUMBERS = [
	"0",
	"1",
	"2",
	"-1",
	"3",
	"1.5",
	"0.1",
	"-0",
	"0x10",
	"1e21",
	"NaN",
	"Infinity",
	"2 ** 53",
	"0b101",
	"0o17",
	"1_000",
	"25.",
	"23..toString()",
	"24 .toString()",
	"0x26.toString()",
	"(b + 1-0.1-0.1-0.1)"
];
const STRINGS = [
	'""',
	'"a"',
	'"b"',
	'"foo"',
	'"1"',
	'"x\\ny"',
	"'q\"'",
	'"\\u00e9"',
	'"length"',
	'"constructor"'
];
const OTHERS = [
	"true",
	"false",
	"null",
	"undefined",
	"void 0",
	"/[a2][^e]+$/",
	"[,0][1]",
	"([,0].length === 2)"
];
// Spellings the printer and `keep_numbers` must keep apart: radixes, separators,
// exponents, the extremes and values that round.
const MORE_NUMBERS = [
	"0X1F",
	"1e-7",
	".5",
	"5e-324",
	"1.7976931348623157e308",
	"0.000001",
	"4294967296",
	"9007199254740993",
	"0b1_0",
	"0xFF_FF",
	"1_0.5_0",
	"1E+3",
	"123456789012345680000",
	"-(2 ** 31)",
	"0.1 + 0.2",
	"-Infinity",
	"1 / -0"
];
// Escapes, a line continuation, astral and lone surrogate characters, and text
// an inline script must not end on.
const MORE_STRINGS = [
	'"\\u{1F600}"',
	'"\\x41\\x42"',
	'"\\0"',
	'"a\\\nb"',
	'"\\u2028\\u2029"',
	'"</script>"',
	'"\\r\\n\\t"',
	"'\"\\''",
	'"\\\\"',
	'"😀"',
	'"\\ud83d"',
	'"é"',
	'"\\v\\f\\b"',
	// eslint-disable-next-line no-template-curly-in-string
	'"$${a}"'
];
// What only sloppy code may write.
const SLOPPY_LITERALS = ["017", "08", "019.5", '"\\101"', '"\\8"'];
const REGEXPS = [
	"/(?<y>\\d+)-\\k<y>/u",
	"/./su",
	"/\\p{L}+/u",
	"/a(?=b)/g",
	"/(?<!x)b/",
	"/[/]\\//",
	"/^$/m",
	"/\\bfoo\\b/i",
	"/a|/y",
	"/(a)|(b)/d"
];
const REGEXP_SUBJECTS = [
	'"12-12"',
	'"ab\\nb"',
	'"é1"',
	'"xaby"',
	'"foo bar"',
	'"/"'
];
const TYPEOF_OUTCOMES = ["function", "undefined", "string", "number", "object"];
// BigInts meet only each other: the compressor, as terser's, drops arithmetic
// nobody reads, though mixing them with numbers throws.
const BIGINTS = ["0n", "1n", "-2n", "2n ** 64n", "0x10n"];
const BIGINT_BINARY = [
	"+",
	"-",
	"*",
	"/",
	"%",
	"**",
	"&",
	"|",
	"^",
	"<<",
	">>",
	"==",
	"<",
	"==="
];
const UNARY = ["!", "-", "+", "~", "typeof ", "void "];
const BINARY = [
	"+",
	"-",
	"*",
	"/",
	"%",
	"**",
	"==",
	"===",
	"!=",
	"!==",
	"<",
	">",
	"<=",
	">=",
	"&",
	"|",
	"^",
	"<<",
	">>",
	">>>",
	"&&",
	"||",
	"??",
	"in",
	"instanceof"
];
const ASSIGN = [
	"=",
	"=",
	"+=",
	"-=",
	"*=",
	"/=",
	"%=",
	"&=",
	"|=",
	"^=",
	"<<=",
	">>=",
	">>>=",
	"**=",
	"||=",
	"&&=",
	"??="
];
// What ufuzz writes around an update, which a printer must not lose or glue.
const COMMENTED_UPDATES = [
	"a/* ignore */++",
	"b/* ignore */--",
	"++/* ignore */a",
	"--/* ignore */b",
	"--(b)"
];
// No `toString` or `valueOf`: the compressor, as terser's, drops a key or an
// operand nobody reads, though converting it would run the method.
const KEYS = ["a", "b", "c", "length", "0", "1", "constructor"];
const METHODS = ["a", "b", "c", "length"];
const MUTABLE = new Set(["var", "let", "param"]);
const NUMBER_ARGUMENTS = [
	"0",
	"1",
	"2",
	"-1",
	"3.5",
	"255",
	"1e3",
	"NaN",
	"-0",
	"Infinity"
];
const STRING_RECEIVERS = [
	'"abc"',
	'""',
	'"a,b,c"',
	'" x "',
	'"ff"',
	'"\\u00e9"'
];
const STRING_METHODS = [
	"charAt",
	"charCodeAt",
	"indexOf",
	"lastIndexOf",
	"slice",
	"substring",
	"toUpperCase",
	"toLowerCase",
	"trim",
	"repeat",
	"padStart",
	"startsWith",
	"includes",
	"concat"
];
const MATH_UNARY = [
	"abs",
	"floor",
	"ceil",
	"round",
	"sign",
	"trunc",
	"sqrt",
	"cbrt",
	"log2"
];

/**
 * @typedef {object} Program
 * @property {string} code the source
 * @property {boolean} module whether it is a module, strict and able to `await` at its top level
 */

/**
 * mulberry32: a small seeded generator, so a seed always writes the same programs.
 * @param {number} seed the seed
 * @returns {() => number} a number in [0, 1) per call
 */
const createRandom = (seed) => {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

/**
 * A generator of programs for a seed: each call writes the next program.
 * @param {number} seed the seed
 * @returns {() => Program} the next program per call
 */
const createProgramGenerator = (seed) => {
	const random = createRandom(seed);
	let counter = 0;

	/**
	 * @param {number} n how many choices
	 * @returns {number} one of `0` to `n - 1`
	 */
	const below = (n) => Math.floor(random() * n);
	/**
	 * @template T
	 * @param {T[]} list the choices
	 * @returns {T} one of them
	 */
	const pick = (list) => list[below(list.length)];
	/**
	 * @param {number} probability chance of `true`
	 * @returns {boolean} whether the chance came up
	 */
	const chance = (probability) => random() < probability;
	/**
	 * @param {string} prefix what the name starts with
	 * @returns {string} a name not used before in this program
	 */
	const fresh = (prefix) => `${prefix}${counter++}`;

	/**
	 * A namespace converts to no primitive, which `pure_conversions` takes as
	 * free of effects, and a caught error's text names what mangling renames.
	 * @param {Binding} binding a binding
	 * @returns {boolean} whether it may be read as a value
	 */
	const isPlainValue = (binding) =>
		binding.kind !== "namespace" && binding.kind !== "caught";

	/**
	 * @param {Context} context the context
	 * @param {(binding: Binding) => boolean} filter which bindings qualify
	 * @returns {Binding | undefined} a binding in scope that qualifies
	 */
	const pickBinding = (context, filter) => {
		const found = context.bindings.filter(filter);
		return found.length === 0 ? undefined : pick(found);
	};

	/**
	 * @param {Context} context the context
	 * @param {Partial<Context>} changes what differs inside
	 * @returns {Context} a context for a nested scope
	 */
	const inner = (context, changes) => ({
		...context,
		bindings: [...context.bindings],
		depth: context.depth + 1,
		scopeTop: false,
		...changes
	});

	/**
	 * @param {Context} context the context
	 * @returns {Context} a context for a function body
	 */
	const functionContext = (context) =>
		inner(context, {
			inFunction: true,
			inGenerator: false,
			inAsync: false,
			inLoop: false,
			inSwitch: false,
			inClass: false,
			hasArguments: true,
			hasNewTarget: true,
			scopeTop: true,
			labels: [],
			loopLabels: []
		});

	/**
	 * @param {Context} context the context
	 * @returns {Context} a context for an arrow's body, which sees the outer `arguments`
	 */
	const arrowContext = (context) => ({
		...functionContext(context),
		hasArguments: context.hasArguments,
		hasNewTarget: context.hasNewTarget
	});

	/**
	 * @returns {string} a literal
	 */
	const literal = () => {
		const kind = below(3);
		if (kind === 0) return pick(NUMBERS);
		if (kind === 1) return pick(STRINGS);
		return pick(OTHERS);
	};

	/**
	 * @param {Context} context the context
	 * @param {number} depth how much more an expression may nest
	 * @returns {string} arguments for a call
	 */
	const callArguments = (context, depth) => {
		const count = below(3);
		/** @type {string[]} */
		const list = [];
		for (let i = 0; i < count; i++) {
			list.push(
				chance(0.15)
					? `...${array(context, depth)}`
					: expression(context, depth)
			);
		}
		return list.join(", ");
	};

	/**
	 * @param {Context} context the context
	 * @param {number} depth how much more an expression may nest
	 * @returns {string} an array literal
	 */
	const array = (context, depth) => {
		const count = below(4);
		/** @type {string[]} */
		const elements = [];
		for (let i = 0; i < count; i++) {
			const kind = below(8);
			if (kind === 0) elements.push("");
			else if (kind === 1) elements.push(`...${array(context, depth - 1)}`);
			else elements.push(expression(context, depth - 1));
		}
		// A trailing hole needs its own comma to count.
		return `[${elements.join(", ")}${
			elements[elements.length - 1] === "" ? "," : ""
		}]`;
	};

	/**
	 * @param {Context} context the context
	 * @param {number} depth how much more an expression may nest
	 * @returns {string} an object literal
	 */
	const object = (context, depth) => {
		const count = below(4);
		/** @type {string[]} */
		const properties = [];
		let spread = false;
		for (let i = 0; i < count; i++) {
			const key = pick(KEYS);
			let kind = below(9);
			// V8 orders an accessor after a spread behind the data properties, so
			// dropping a spread of a primitive would show in the keys' order.
			if (kind === 2) spread = true;
			if (kind === 5 && spread) kind = 6;
			const value = expression(context, depth - 1);
			if (kind === 0) {
				properties.push(`[${expression(context, depth - 1)}]: ${value}`);
			} else if (kind === 1) {
				properties.push(`${JSON.stringify(key)}: ${value}`);
			} else if (kind === 2) {
				properties.push(`...${expression(context, depth - 1)}`);
			} else if (kind === 3) {
				const binding = pickBinding(context, isPlainValue);
				properties.push(binding ? binding.name : `${key}: ${value}`);
			} else if (kind === 4) {
				const body = functionContext(context);
				properties.push(
					`${key}() { ${guard()} return ${expression(body, depth - 1)}; }`
				);
			} else if (kind === 5) {
				// A getter reads only: the compressor may drop a read nobody uses.
				properties.push(`get ${key}() { return ${literal()}; }`);
			} else if (kind === 7 && !spread) {
				const setter = functionContext(context);
				const parameter = fresh("p");
				setter.bindings.push({ name: parameter, kind: "param" });
				properties.push(
					`set ${pick(METHODS)}(${parameter}) { ${guard()} this.${pick([
						"x",
						"y"
					])} ${pick(ASSIGN)} ${expression(setter, depth - 1)}; }`
				);
			} else {
				properties.push(`${key}: ${value}`);
			}
		}
		return `{ ${properties.join(", ")} }`;
	};

	/**
	 * @returns {string} the statement every function body opens with
	 */
	const guard = () => "if (_calls_-- <= 0) return;";

	/**
	 * @param {Context} context the context
	 * @param {number} depth how much more an expression may nest
	 * @returns {string} an arrow or function expression
	 */
	const functionExpression = (context, depth) => {
		const arrow = chance(0.75);
		const body = arrow ? arrowContext(context) : functionContext(context);
		const params = parameters(body, depth);
		if (arrow && chance(0.6)) {
			return `(${params}) => _calls_-- > 0 ? ${expression(
				body,
				depth - 1
			)} : ${literal()}`;
		}
		const statements = block(body, 2);
		return arrow
			? `(${params}) => { ${guard()} ${statements} return ${expression(
					body,
					depth - 1
				)}; }`
			: `function (${params}) { ${guard()} ${statements} return ${expression(
					body,
					depth - 1
				)}; }`;
	};

	/**
	 * @param {Context} context the function's context, which the parameters join
	 * @param {number} depth how much more a default may nest
	 * @returns {string} a parameter list
	 */
	const parameters = (context, depth) => {
		const count = below(3);
		/** @type {string[]} */
		const list = [];
		for (let i = 0; i < count; i++) {
			const name = fresh("p");
			const kind = below(6);
			if (kind === 0) {
				list.push(`${name} = ${expression(context, depth - 1)}`);
			} else if (kind === 1) {
				const other = fresh("p");
				list.push(`{ a: ${name}, ...${other} } = {}`);
				context.bindings.push({ name: other, kind: "param" });
			} else if (kind === 2) {
				const other = fresh("p");
				list.push(`[${name}, , ${other} = ${literal()}] = []`);
				context.bindings.push({ name: other, kind: "param" });
			} else {
				list.push(name);
			}
			context.bindings.push({ name, kind: "param" });
		}
		if (chance(0.2)) {
			const rest = fresh("r");
			list.push(`...${rest}`);
			context.bindings.push({ name: rest, kind: "param" });
		}
		return list.join(", ");
	};

	/**
	 * @param {Context} context the context
	 * @param {number} depth how much more an expression may nest
	 * @returns {string} a call of a function or a construction of a class in scope
	 */
	const call = (context, depth) => {
		const target = pickBinding(
			context,
			(binding) =>
				binding.kind === "function" ||
				binding.kind === "class" ||
				binding.kind === "generator"
		);
		if (target === undefined) {
			return `(${functionExpression(context, depth)})(${callArguments(
				context,
				depth - 1
			)})`;
		}
		const args = callArguments(context, depth - 1);
		if (target.kind === "class") return `new ${target.name}(${args})`;
		if (target.kind === "generator") return `[...${target.name}(${args})]`;
		return chance(0.3)
			? `${target.name}?.(${args})`
			: `${target.name}(${args})`;
	};

	/**
	 * @param {Context} context the context
	 * @param {number} depth how much more an expression may nest
	 * @returns {string} a class expression or declaration body
	 */
	const classBody = (context, depth) => {
		const base = pickBinding(context, (binding) => binding.kind === "class");
		const heritage =
			base !== undefined && chance(0.5) ? ` extends ${base.name}` : "";
		const body = inner(functionContext(context), {
			inClass: true,
			strict: true
		});
		const field = fresh("f");
		const members = [];
		// A field's initializer may not read `arguments`.
		const fields = { ...body, hasArguments: false };
		members.push(`${field} = ${expression(fields, depth - 1)};`);
		members.push(`#${field} = ${expression(fields, depth - 1)};`);
		if (chance(0.5)) members.push(`static ${fresh("s")} = ${literal()};`);
		if (chance(0.3)) {
			members.push(
				`static { _print("static", ${expression(
					{ ...functionContext(context), strict: true, hasArguments: false },
					depth - 1
				)}); }`
			);
		}
		// The constructor's parameters are its own, out of the methods' scope.
		const constructorBody = inner(body, {});
		const params = parameters(constructorBody, depth);
		const superCall =
			heritage === ""
				? ""
				: `super(${callArguments(constructorBody, depth - 1)});`;
		members.push(
			`constructor(${params}) { ${superCall} if (_calls_-- <= 0) return; ${block(
				constructorBody,
				2
			)} }`
		);
		const method = pick(METHODS);
		members.push(
			`${method}() { ${guard()} return [this.#${field}, ${
				heritage === "" ? "" : `super.${method}?.(), `
			}${expression(body, depth - 1)}]; }`
		);
		members.push(`get ${fresh("g")}() { return this.#${field}; }`);
		members.push(`#${fresh("m")}() { return this.${field}; }`);
		if (chance(0.3)) members.push(`static #${fresh("h")} = 1;`);
		members.push(`has(o) { return #${field} in o; }`);
		return `${heritage} { ${members.join(" ")} }`;
	};

	/**
	 * @param {Context} context the context
	 * @param {number} depth how much more an expression may nest
	 * @returns {string} a template literal, tagged or not
	 */
	const template = (context, depth) => {
		const parts = ["a", "", "\\n", "$\\{", "b\\u0041", "\\`x", "\\x41"];
		let text = pick(parts);
		const count = below(3);
		for (let i = 0; i < count; i++) {
			text += `\${${expression(context, depth - 1)}}${pick(parts)}`;
		}
		return chance(0.4) ? `_tag\`${text}\`` : `\`${text}\``;
	};

	/**
	 * @param {Context} context the context
	 * @param {number} depth how much more an expression may nest
	 * @returns {string} a function run where it is written, in one of ufuzz's forms
	 */
	const immediatelyInvoked = (context, depth) => {
		const body = functionContext(context);
		const statements = `${guard()} ${block(body, 2)}`;
		const form = below(5);
		if (form === 0) return `(function () { ${statements} })()`;
		if (form === 1) return `+function () { ${statements} }()`;
		if (form === 2) return `!function () { ${statements} }()`;
		if (form === 3) return `void function () { ${statements} }()`;
		const fields = [];
		for (let i = below(3); i >= 0; i--) {
			fields.push(
				`this${pick([
					".x",
					".y",
					`[${expression(body, depth - 1)}]`
				])} = ${expression(body, depth - 1)};`
			);
		}
		return `new function () { ${fields.join(" ")} ${statements} }()`;
	};

	/**
	 * @returns {string} an array literal of literals
	 */
	const literalArray = () => {
		const elements = [];
		for (let i = below(4); i >= 0; i--) {
			elements.push(chance(0.1) ? "" : literal());
		}
		return `[${elements.join(", ")}${elements[elements.length - 1] === "" ? "," : ""}]`;
	};

	/**
	 * What webpack's own rewrites, the `improve` phase, look for: built-ins on
	 * literals, spellings with a shorter equal, and assignments it folds.
	 * @param {Context} context the context
	 * @param {number} depth how much more an expression may nest
	 * @returns {string} an expression
	 */
	const rewriteTarget = (context, depth) => {
		const number = () => pick(NUMBER_ARGUMENTS);
		const string = () => pick(STRING_RECEIVERS);
		const target = pickBinding(context, (b) => MUTABLE.has(b.kind));
		switch (below(20)) {
			case 0:
				return `Math.${pick(["max", "min", "pow", "atan2"])}(${number()}, ${number()})`;
			case 1:
				return `Math.${pick(MATH_UNARY)}(${number()})`;
			case 2:
				return `${string()}.${pick(STRING_METHODS)}(${pick(["", "0", "1", "-1", "2", '"b"'])})`;
			case 3:
				return `${string()}.split(${pick(['","', '""', '"b"'])})${chance(0.5) ? ".length" : ""}`;
			case 4:
				return `(${number()}).${pick(["toString", "toFixed", "toPrecision"])}(${pick(["", "2", "16", "36"])})`;
			case 5:
				return `${literalArray()}.${pick(["join", "indexOf", "includes", "concat", "slice", "at"])}(${pick(["", '","', '"-"', "1", literalArray()])})`;
			case 6:
				return `${literalArray()}${pick([".length", "[0]", "[1]", "[5]"])}`;
			case 7:
				return `${pick(["new Array", "Array", "new Object", "Object"])}(${pick(["", "3", "1, 2", '"a"', literal()])})`;
			case 8:
				return `${pick(["Number", "String", "Boolean", "BigInt"])}(${pick([literal(), number(), '"0x10"', '" 12 "', "1.5"])})`;
			case 9:
				return `${pick(["parseInt", "parseFloat"])}(${pick(['"ff"', '" 1.5e3x"', '"0x1f"', string()])}${pick(["", ", 16", ", 2", ", 36"])})`;
			case 10:
				return `JSON.stringify(${chance(0.5) ? literalArray() : `{ a: ${literal()}, "b c": ${literal()} }`})`;
			case 11:
				return `${pick(["new RegExp", "RegExp"])}(${pick(['"a+"', '"[b]"', '"\\\\d"', '"/"'])}${pick(["", ', "g"', ', "i"'])})${pick([".source", ".flags", '.test("ab1")'])}`;
			case 12:
				return `${pick(["new Error", "Error", "new TypeError", "TypeError"])}(${string()})${pick([".message", ".name"])}`;
			case 13:
				return pick([
					"+[]",
					'"" + [1, 2]',
					"[] + {}",
					'+"0x10"',
					'"" + 1n',
					"!!+[]",
					"~~1.5"
				]);
			case 14:
				return `${pick(["!!", "Boolean", "!"])}(${expression(context, depth - 1)})`;
			case 15: {
				const left = expression(context, depth - 1);
				return `!((${left}) ${pick(["==", "===", "!=", "<"])} (${expression(context, depth - 1)}))`;
			}
			case 16:
				if (target === undefined) return literal();
				return `(typeof ${target.name} ${pick(['== "undefined"', '!= "undefined"', '> "u"'])})`;
			case 17:
				if (target === undefined) return literal();
				return pick([
					`(${target.name} || (${target.name} = ${expression(context, depth - 1)}))`,
					`(${target.name} && (${target.name} = ${expression(context, depth - 1)}))`,
					`(${target.name} ?? (${target.name} = ${expression(context, depth - 1)}))`,
					`(${target.name} = ${target.name} || (${expression(context, depth - 1)}))`
				]);
			case 18:
				if (target === undefined) return literal();
				return pick([
					`(${target.name} == null ? void 0 : ${target.name}.length)`,
					`(${target.name} === null || ${target.name} === void 0 ? void 0 : ${target.name}.a)`,
					`((${target.name} = ${expression(context, depth - 1)}) === null || ${target.name} === void 0 ? void 0 : ${target.name}.length)`
				]);
			default:
				if (target === undefined) return literal();
				return `((${expression(context, depth - 1)}) ? ${target.name} = ${expression(context, depth - 1)} : ${target.name} = ${expression(context, depth - 1)})`;
		}
	};

	/**
	 * Syntax a program rarely holds: literal spellings, regular expressions,
	 * sloppy-only forms, `new.target`, `super` in an object, `this` passed or
	 * lost by a call's form, mapped `arguments`, direct `eval` and spread `new`.
	 * @param {Context} context the context
	 * @param {number} depth how much more an expression may nest
	 * @returns {string} an expression
	 */
	const rareExpression = (context, depth) => {
		switch (below(15)) {
			case 12:
				return context.module
					? pick([
							"import.meta.url",
							"(typeof import.meta)",
							"Object.keys(import.meta)"
						])
					: literal();
			case 13: {
				const namespace = pickBinding(context, (b) => b.kind === "namespace");
				if (namespace === undefined) return literal();
				return pick([
					`${namespace.name}.counter`,
					`${namespace.name}.bump()`,
					`Object.keys(${namespace.name})`,
					`${namespace.name}[Symbol.toStringTag]`,
					`new ${namespace.name}.default().m()`,
					`(${JSON.stringify(pick(KEYS))} in ${namespace.name})`
				]);
			}
			case 0:
				return pick(MORE_NUMBERS);
			case 1:
				return pick(MORE_STRINGS);
			case 2:
				return `${pick(REGEXPS)}.${pick(["test", "exec"])}(${pick(REGEXP_SUBJECTS)})`;
			case 3:
				return `${pick(REGEXP_SUBJECTS)}.${pick([
					'replace(/(\\w)/g, "$1-")',
					"split(/[b-]/)",
					"match(/\\d+/g)",
					"search(/b/)",
					"replaceAll(/a/g, () => 1)"
				])}`;
			case 4:
				return context.strict ? literal() : pick(SLOPPY_LITERALS);
			case 5:
				return context.hasNewTarget
					? pick(["(typeof new.target)", "(new.target === undefined)"])
					: literal();
			case 6: {
				const method = functionContext(context);
				return `({ __proto__: { m() { return ${literal()}; } }, m() { ${guard()} return [super.m(), ${expression(
					method,
					depth - 1
				)}]; } }).m()`;
			}
			case 7:
				return pick([
					"(0, { m() { return typeof this; } }.m)()",
					"({ m() { return typeof this; } }).m()",
					"({ m() { return typeof this; } })?.m()",
					`({ k: 1, t(s, v) { return [s.raw[0], v, this.k]; } }).t\`a\${${expression(
						context,
						depth - 1
					)}}b\``
				]);
			case 8:
				// A sloppy function's `arguments` maps its simple parameters.
				return context.hasArguments && !context.strict
					? `(arguments[0] = ${expression(context, depth - 1)}, arguments[0])`
					: literal();
			case 9: {
				// A direct `eval` reads names the minifier must then keep.
				const binding = pickBinding(
					context,
					(b) => MUTABLE.has(b.kind) || b.kind === "const"
				);
				return binding === undefined
					? 'eval("1 + 1")'
					: `eval(${JSON.stringify(binding.name)})`;
			}
			case 10:
				return `new (class { constructor(...r) { this.n = r.length; } })(...${array(
					context,
					depth - 1
				)}).n`;
			case 11:
				return `(${expression(context, depth - 1)})?.a?.[${pick(KEYS.map((k) => JSON.stringify(k)))}]?.()`;
			default:
				// A call annotated pure may go unused, never its argument's effects.
				return `/*#__PURE__*/ _pure(${expression(context, depth - 1)})`;
		}
	};

	/**
	 * @param {Context} context the context
	 * @param {number} depth how much more an expression may nest
	 * @returns {string} an expression
	 */
	const expression = (context, depth) => {
		if (depth <= 0) {
			const binding = pickBinding(
				context,
				(b) => MUTABLE.has(b.kind) || b.kind === "const"
			);
			return binding !== undefined && chance(0.5) ? binding.name : literal();
		}
		const kind = below(46);
		switch (kind) {
			case 40:
			case 41:
			case 42:
			case 43:
			case 44:
			case 45:
				return rareExpression(context, depth);
			case 36:
			case 37:
			case 38:
			case 39:
				return rewriteTarget(context, depth);
			case 26:
				return pick([
					`(a++ + (${expression(context, depth - 1)}))`,
					`((--b) + (${expression(context, depth - 1)}))`,
					`((c = c + 1) + (${expression(context, depth - 1)}))`
				]);
			case 27:
				return pick(COMMENTED_UPDATES);
			case 28:
				return `delete (${expression(context, depth - 1)})${pick([
					".a",
					".length",
					`[${expression(context, depth - 1)}]`
				])}`;
			case 29: {
				// Read only through `typeof`, the one read an undeclared name survives.
				const name = `undeclared_${below(3)}`;
				return chance(0.5)
					? `(typeof ${name} ${pick(["==", "===", "!=", "!=="])} "${pick(
							TYPEOF_OUTCOMES
						)}")`
					: `(typeof ${name})`;
			}
			case 30:
				return context.hasArguments
					? pick([
							"arguments.length",
							"arguments[0]",
							`arguments[${expression(context, depth - 1)}]`
						])
					: literal();
			case 31:
			case 32:
				return immediatelyInvoked(context, depth);
			case 33:
				return pick([
					`((${expression(context, depth - 1)}) || a || 3).toString()`,
					`/[abc4]/.test(((${expression(
						context,
						depth - 1
					)}) || b || 5).toString())`,
					`((${expression(context, depth - 1)}) || ${below(
						10
					)}).toString()[${expression(context, depth - 1)}]`
				]);
			case 34: {
				const target = pickBinding(context, (b) => MUTABLE.has(b.kind));
				if (target === undefined) return literal();
				// Guarded as ufuzz guards it: `null` and `undefined` have no properties.
				return `(${target.name} && (${target.name}${pick([
					".a",
					".b",
					`[${expression(context, depth - 1)}]`
				])} ${pick(ASSIGN)} ${expression(context, depth - 1)}))`;
			}
			case 35: {
				// ufuzz's call of a name that may not hold a function yet.
				const name = `fn${below(Math.max(counter, 1))}`;
				return `(typeof ${name} == "function" && --_calls_ >= 0 && ${name}(${callArguments(
					context,
					depth - 1
				)}))`;
			}
			case 0:
			case 1:
				return literal();
			case 2:
			case 3: {
				const binding = pickBinding(context, isPlainValue);
				return binding === undefined ? literal() : binding.name;
			}
			case 4:
				return `${pick(UNARY)}(${expression(context, depth - 1)})`;
			case 5:
			case 6:
				return `(${expression(context, depth - 1)}) ${pick(
					BINARY
				)} (${expression(context, depth - 1)})`;
			case 7:
				return `(${expression(context, depth - 1)}) ? (${expression(
					context,
					depth - 1
				)}) : (${expression(context, depth - 1)})`;
			case 8: {
				const target = pickBinding(context, (b) => MUTABLE.has(b.kind));
				if (target === undefined) return literal();
				return `(${target.name} ${pick(ASSIGN)} ${expression(
					context,
					depth - 1
				)})`;
			}
			case 9: {
				const target = pickBinding(context, (b) => MUTABLE.has(b.kind));
				if (target === undefined) return literal();
				return pick([
					`${target.name}++`,
					`--${target.name}`,
					`${target.name}--`,
					`++${target.name}`
				]);
			}
			case 10:
				return array(context, depth);
			case 11:
				return object(context, depth);
			case 12: {
				const target = `(${expression(context, depth - 1)})`;
				const dot = chance(0.4) ? "?." : ".";
				if (chance(0.5)) return `${target}${dot}${pick(["a", "b", "length"])}`;
				const key = chance(0.5)
					? pick(["0", "1"])
					: expression(context, depth - 1);
				return `${target}${dot === "?." ? "?." : ""}[${key}]`;
			}
			case 13:
				return `(${expression(context, depth - 1)})?.${pick(METHODS)}?.()`;
			case 14:
			case 15:
				return call(context, depth);
			case 16:
				return functionExpression(context, depth);
			case 17:
				return template(context, depth);
			case 18: {
				// No parameter: `compress.arguments`, as terser's, reads `arguments[0]`
				// as the parameter it maps though a destructuring assigned it.
				const assignable = (/** @type {Binding} */ b) =>
					b.kind === "var" || b.kind === "let";
				const first = pickBinding(context, assignable);
				const second = pickBinding(context, assignable);
				if (first === undefined || second === undefined || first === second) {
					return literal();
				}
				return chance(0.5)
					? `([${first.name}, ${second.name} = ${literal()}] = ${array(
							context,
							depth - 1
						)})`
					: `({ a: ${first.name}, b: ${second.name} = ${literal()} } = ${object(
							context,
							depth - 1
						)})`;
			}
			case 19:
				return `(class${classBody(context, depth - 1)})`;
			case 20:
				return `(${expression(context, depth - 1)}, ${expression(
					context,
					depth - 1
				)})`;
			case 21:
				return `/a|b\\d/${pick(["", "g", "i", "y"])}.test(${expression(
					context,
					depth - 1
				)})`;
			case 22:
				if (context.inAsync) {
					return `(await (${expression(context, depth - 1)}))`;
				}
				return literal();
			case 23:
				if (context.inGenerator) {
					return `(yield ${expression(context, depth - 1)})`;
				}
				return literal();
			case 24:
				return context.inClass
					? pick(["this", "this.constructor === Object"])
					: literal();
			default:
				return `(${expression(context, depth - 1)}) ?? (${expression(
					context,
					depth - 1
				)})`;
		}
	};

	/**
	 * @param {Context} context the context
	 * @param {number} count how many statements at most
	 * @returns {string} statements
	 */
	const block = (context, count) => {
		const n = below(count + 1);
		/** @type {string[]} */
		const list = [];
		for (let i = 0; i < n; i++) list.push(statement(context));
		return list.join("\n");
	};

	/**
	 * @param {Context} context the context
	 * @param {string} keyword `let`, `const` or `var`
	 * @returns {string} a declaration whose names join the context
	 */
	const declaration = (context, keyword) => {
		const kind = /** @type {Binding["kind"]} */ (keyword);
		const name = fresh(keyword[0]);
		// Names join only once declared: the minifier, as terser's, assumes no
		// program reads one early and fails in its temporal dead zone.
		const value = expression(context, 3);
		const shape = below(5);
		if (shape === 0) {
			const other = fresh(keyword[0]);
			const second = expression(context, 2);
			context.bindings.push({ name, kind }, { name: other, kind });
			return `${keyword} [${name}, ...${other}] = [${value}, ${second}];`;
		}
		if (shape === 1) {
			const other = fresh(keyword[0]);
			context.bindings.push({ name, kind }, { name: other, kind });
			return `${keyword} { a: ${name} = ${literal()}, ...${other} } = { a: ${value}, b: ${literal()} };`;
		}
		context.bindings.push({ name, kind });
		return `${keyword} ${name} = ${value};`;
	};

	/**
	 * @param {string} value an expression
	 * @returns {string} it as a statement, parenthesized where it would read as
	 * a block, a declaration or a label
	 */
	const expressionStatement = (value) =>
		/^(?:[{[]|function\b|class\b|let\b|async\b|[A-Za-z_$][\w$]*\s*:)/.test(
			value
		)
			? `(${value});`
			: `${value};`;

	/**
	 * @param {string} name a name
	 * @returns {string} it spelled with its first character escaped
	 */
	const escapedName = (name) =>
		`\\u${name.charCodeAt(0).toString(16).padStart(4, "0")}${name.slice(1)}`;

	/**
	 * Statements a program rarely holds: `with`, `debugger`, a `finally` that
	 * returns, async generators, patterns in `catch` and loop heads, a class of
	 * accessors and computed members, labeled nested loops, escaped and
	 * non-ASCII names, and a `switch` with blocks and a `default` in between.
	 * @param {Context} context the context
	 * @returns {string} a statement
	 */
	const rareStatement = (context) => {
		switch (below(13)) {
			case 11:
				return compiledStatement(context);
			case 12:
				return commentedStatement(context);
			case 10:
				return context.module
					? 'import("dep").then((m) => _print("dynamic", m.counter, m.bump(), typeof m.default));'
					: `_print(${expression(context, 2)});`;
			case 0: {
				if (context.strict) return `_print(${expression(context, 2)});`;
				// `a` reads the object's own while the `with` runs, `b` the outer one.
				const name = fresh("w");
				return `with ({ a: ${literal()}, ${name}: ${expression(context, 1)} }) { _print(a, b, typeof ${name}); a = ${expression(
					context,
					1
				)}; ${block(inner(context, {}), 2)} _print(a); }`;
			}
			case 1:
				return `debugger; _print(${expression(context, 2)});`;
			case 2:
				if (!context.inFunction) return `_print(${expression(context, 2)});`;
				return `try { ${block(inner(context, {}), 2)} return ${expression(
					context,
					2
				)}; } finally { _print("finally"); ${
					chance(0.5) ? `return ${expression(context, 1)};` : ""
				} }`;
			case 3: {
				const name = fresh("ag");
				const body = {
					...functionContext(context),
					inGenerator: true,
					inAsync: true
				};
				const declared = `const ${name} = async function* () { ${guard()} yield ${expression(
					body,
					2
				)}; await null; yield* [${expression(body, 1)}]; ${block(body, 2)} };`;
				if (context.inAsync) {
					const item = fresh("v");
					return `${declared} for await (const ${item} of ${name}()) _print("each", ${item});`;
				}
				return `${declared} ${name}().next().then((r) => _print("next", r.value, r.done), (e) => _print("rejected", _error(e)));`;
			}
			case 4: {
				const name = fresh("e");
				const message = fresh("e");
				const handler = inner(context, {});
				handler.bindings.push(
					{ name, kind: "let" },
					{ name: message, kind: "let" }
				);
				// Never a function: mangling may rename the `name` read off it.
				return `try { throw ${pick([
					'new TypeError("t")',
					'{ name: "n", message: 1 }',
					"[1, 2]",
					literal()
				])}; } catch ({ name: ${name}, message: ${message} = "none" }) { _print(${name}, ${message}); ${block(
					handler,
					1
				)} }`;
			}
			case 5: {
				const key = fresh("k");
				const value = fresh("v");
				const body = inner(context, { inLoop: true });
				body.bindings.push(
					{ name: key, kind: "const" },
					{ name: value, kind: "const" }
				);
				return chance(0.5)
					? `for (const [${key}, ${value}] of Object.entries(${object(context, 2)})) { ${block(body, 2)} }`
					: `for (const { a: ${key} = ${literal()}, ...${value} } of [{}, ${object(context, 2)}]) { ${block(body, 2)} }`;
			}
			case 6: {
				const name = fresh("K");
				const key = JSON.stringify(pick(KEYS));
				const fields = {
					...functionContext(context),
					inClass: true,
					strict: true,
					hasArguments: false
				};
				context.bindings.push({ name, kind: "class" });
				return `class ${name} { static s = ${literal()}; static m() { return this.s; } get g() { return ${expression(
					fields,
					2
				)}; } set g(v) { this._g = v; } [${key}]() { return ${literal()}; } static { this.t = this.s; } async am() { return await (${literal()}); } *gm() { yield ${literal()}; } static get [${key}]() { return 1; } }
_print(${name}.m(), ${name}.t, ${name}[${key}], new ${name}().g, typeof new ${name}()[${key}], [...new ${name}().gm()]); new ${name}().am().then((v) => _print("am", v));`;
			}
			case 7: {
				const outer = fresh("L");
				const innerLabel = fresh("L");
				const brake = fresh("brake");
				const i = fresh("i");
				const j = fresh("j");
				const body = inner(context, {
					inLoop: true,
					labels: [...context.labels, outer, innerLabel],
					loopLabels: [...context.loopLabels, outer, innerLabel]
				});
				body.bindings.push(
					{ name: i, kind: "const" },
					{ name: j, kind: "const" }
				);
				return `{ var ${brake} = 9; ${outer}: for (let ${i} = 0; ${i} < 3; ${i}++) { ${innerLabel}: for (let ${j} = 0; ${j} < 3; ${j}++) { if (--${brake} < 0) break ${outer}; if (${expression(
					body,
					1
				)}) continue ${outer}; if (${expression(body, 1)}) break ${innerLabel}; ${block(body, 2)} _print(${i}, ${j}); } } }`;
			}
			case 8: {
				const name = chance(0.5) ? fresh("ä") : fresh("v");
				const value = expression(context, 2);
				context.bindings.push({ name, kind: "var" });
				return `var ${chance(0.5) ? escapedName(name) : name} = ${value};`;
			}
			default: {
				const body = inner(context, { inSwitch: true });
				const name = fresh("x");
				const scoped = inner(body, {});
				scoped.bindings.push({ name, kind: "let" });
				return `switch (${expression(context, 1)}) { case ${literal()}: { let ${name} = ${expression(
					body,
					1
				)}; ${block(scoped, 1)} _print(${name}); } default: _print("default"); case ${literal()}: ${block(
					inner(body, {}),
					1
				)} break; case ${literal()}: _print("last"); }`;
			}
		}
	};

	/**
	 * What compilers write: Babel's and TypeScript's rest parameters, `??` and
	 * `?.` lowered, an enum, a run of assignments to a fresh object.
	 * @param {Context} context the context
	 * @returns {string} a statement
	 */
	const compiledStatement = (context) => {
		const args = `${literal()}, ${literal()}, ${literal()}`;
		const rest = fresh("r");
		const n = fresh("n");
		const k = fresh("k");
		const temp = fresh("_a");
		switch (below(9)) {
			case 0: {
				const from = below(2);
				return `(function (p) { ${guard()} for (var ${n} = arguments.length, ${rest} = Array(${
					from === 0 ? n : `${n} > 1 ? ${n} - 1 : 0`
				}), ${k} = ${from}; ${k} < ${n}; ${k}++) ${rest}[${from === 0 ? k : `${k} - 1`}] = arguments[${k}]; _print(p, ${rest}.length, ${rest}.join("|")); })(${args});`;
			}
			case 1:
				return `(function (p) { ${guard()} var ${rest} = []; for (var ${k} = 1; ${k} < arguments.length; ${k}++) { ${rest}[${k} - 1] = arguments[${k}]; } _print(p, ${rest}.length, ${rest}[0]); })(${args});`;
			case 2:
				return `(function (p) { ${guard()} var ${rest} = ${pick([
					"[...arguments].slice(1)",
					"Array.prototype.slice.call(arguments, 1)",
					"[].slice.call(arguments)",
					"Array.from(arguments)"
				])}; _print(p, ${rest}.length, ${rest}.join("|")); })(${args});`;
			case 3:
				return `var ${temp}; _print((${temp} = ${expression(context, 2)}) !== null && ${temp} !== void 0 ? ${temp} : ${literal()});`;
			case 4:
				return `var ${temp}; _print((${temp} = ${expression(context, 2)}) === null || ${temp} === void 0 ? void 0 : ${temp}.${pick(METHODS)});`;
			case 5: {
				const name = fresh("o");
				return `var ${name} = {}; ${name}.a = ${expression(context, 1)}; ${name}.b = ${literal()}; ${name}["c d"] = ${expression(context, 1)}; _print(${name}.a, ${name}.b, Object.keys(${name}).length);`;
			}
			case 6: {
				const name = fresh("v");
				const other = fresh("v");
				return `var ${name}; ${name} = ${expression(context, 2)}; var ${other} = ${name}; ${other} = ${literal()}; _print(${name}, ${other});`;
			}
			case 7: {
				const name = fresh("E");
				return `var ${name}; (function (${name}) { ${name}[${name}["A"] = 0] = "A"; ${name}[${name}["B"] = ${literal()}] = "B"; })(${name} || (${name} = {})); _print(${name}.A, ${name}[0], ${name}.B);`;
			}
			default: {
				const subject = fresh("s");
				return `var ${subject} = ${expression(context, 2)}; _print(${subject} === null || ${subject} === undefined, ${subject} !== null && ${subject} !== void 0, ${subject} == null || ${subject} === 0, Object.keys(${object(context, 1)}).length, String.fromCharCode(65, 66), Array.of(1, ${literal()}).length, new Map([[1, ${literal()}]]).size); Object.freeze({}); new Set([1]);`;
			}
		}
	};

	/**
	 * A statement behind a comment, or a call an annotation marks.
	 * @param {Context} context the context
	 * @returns {string} a statement
	 */
	const commentedStatement = (context) => {
		switch (below(6)) {
			case 0:
				return `/* note */ ${statement(context)}`;
			case 1:
				return `// note\n${statement(context)}`;
			case 2:
				return `/*! kept */ ${statement(context)}`;
			case 3:
				return `_print(/*#__PURE__*/ _pure(${expression(context, 2)})); /*#__PURE__*/ _pure(${literal()});`;
			case 4:
				return `_print(/*@__NOINLINE__*/ (function () { ${guard()} return ${expression(functionContext(context), 1)}; })());`;
			default:
				return `_print(/*@__INLINE__*/ (function (x) { ${guard()} return x; })(${expression(context, 1)}));`;
		}
	};

	/**
	 * @param {Context} context the context
	 * @returns {string} a statement
	 */
	const statement = (context) => {
		const shallow = context.depth < 3;
		const kind = below(shallow ? 38 : 8);
		switch (kind) {
			case 33:
			case 34:
			case 35:
			case 36:
			case 37:
				return rareStatement(context);
			case 31:
				// Read for no value: what the `improve` phase drops as unobservable.
				return `${pick(["Math.PI", "JSON", "Object.prototype.toString", "new Set", "Object.keys([])", 'new RegExp("a", "i")', "[1].concat([2])", "Math.max(1, 2)"])};`;
			case 32:
				return `(function () { ${guard()} ${block(functionContext(context), 2)} })();`;
			case 24:
				return chance(0.5)
					? "c = c + 1;"
					: `var ${fresh("v")} = ${expression(context, 2)}, ${fresh(
							"v"
						)} = ${expression(context, 2)};`;
			case 25:
				// `return` ends at the line break, so what follows never runs.
				return context.inFunction
					? `{ return\n${expressionStatement(expression(context, 2))} }`
					: `_print(${expression(context, 2)});`;
			case 26:
			case 27: {
				// ufuzz's loops: a counter caps them, and a label may be continued.
				const brake = fresh("brake");
				const label = chance(0.3) ? fresh("L") : undefined;
				const body = inner(context, {
					inLoop: true,
					labels: label ? [...context.labels, label] : context.labels,
					loopLabels: label
						? [...context.loopLabels, label]
						: context.loopLabels
				});
				const target = label ? `${label}: ` : "";
				const condition = `(${expression(context, 2)}) && --${brake} > 0`;
				const form = below(3);
				if (form === 0) {
					return `{ var ${brake} = 5; ${target}while (${condition}) { ${block(
						body,
						3
					)} } }`;
				}
				if (form === 1) {
					return `{ var ${brake} = 5; ${target}do { ${block(
						body,
						3
					)} } while (${condition}); }`;
				}
				const key = fresh("key");
				const value = fresh("v");
				body.bindings.push(
					{ name: key, kind: "var" },
					{ name: value, kind: "var" }
				);
				return `{ var ${brake} = 5, ${value} = ${expression(
					context,
					2
				)}; ${target}for (var ${key} in ${value}) { if (--${brake} < 0) break; c = 1 + c; ${block(
					body,
					3
				)} } }`;
			}
			case 28:
				if (context.loopLabels.length > 0) {
					return `continue ${pick(context.loopLabels)};`;
				}
				return `_print(${pick(COMMENTED_UPDATES)});`;
			case 29: {
				// Annex B lets a `var` redeclare a catch parameter, sloppy code only.
				if (context.strict) return `_print(${expression(context, 2)});`;
				const error = fresh("e");
				const handler = inner(context, {});
				handler.bindings.push({ name: error, kind: "var" });
				return `try { ${block(inner(context, {}), 2)} throw ${expression(
					context,
					1
				)}; } catch (${error}) { var ${error} = ${expression(
					handler,
					2
				)}; _print(${error}); }`;
			}
			case 30: {
				const body = inner(context, { inSwitch: true });
				const cases = [];
				for (let i = below(4); i >= 0; i--) {
					cases.push(
						`${i === 1 ? "default" : `case ${expression(context, 1)}`}: ${block(
							inner(body, {}),
							2
						)}${chance(0.7) ? " break;" : " /* fall-through */"}`
					);
				}
				return `switch (${expression(context, 2)}) { ${cases.join(" ")} }`;
			}
			case 0:
			case 1:
				return `_print(${expression(context, 3)});`;
			case 2:
				return declaration(context, pick(["let", "const", "var"]));
			case 3:
				return expressionStatement(expression(context, 3));
			case 4:
				if (context.inFunction && chance(0.5)) {
					return `return ${expression(context, 2)};`;
				}
				return `_print(${expression(context, 2)}, ${expression(context, 2)});`;
			case 5:
				if (context.inLoop) return pick(["break;", "continue;"]);
				if (context.inSwitch) return "break;";
				return `_print(${expression(context, 2)});`;
			case 6:
				if (context.labels.length > 0) return `break ${pick(context.labels)};`;
				return `_print(${template(context, 2)});`;
			case 7:
				return `if (${expression(context, 2)}) { ${block(
					inner(context, {}),
					2
				)} }${chance(0.5) ? ` else { ${block(inner(context, {}), 2)} }` : ""}`;
			case 8: {
				const index = fresh("i");
				const body = inner(context, { inLoop: true });
				body.bindings.push({ name: index, kind: "const" });
				return `for (let ${index} = 0; ${index} < ${
					1 + below(3)
				}; ${index}++) { ${block(body, 3)} }`;
			}
			case 9: {
				const item = fresh("v");
				const body = inner(context, { inLoop: true });
				body.bindings.push({ name: item, kind: "let" });
				return `for (let ${item} of ${array(context, 2)}) { ${block(
					body,
					3
				)} }`;
			}
			case 10: {
				const key = fresh("k");
				const body = inner(context, { inLoop: true });
				body.bindings.push({ name: key, kind: "const" });
				return `for (const ${key} in ${object(context, 2)}) { ${block(
					body,
					2
				)} }`;
			}
			case 11: {
				const count = fresh("w");
				const body = inner(context, { inLoop: true });
				return chance(0.5)
					? `{ let ${count} = ${1 + below(3)}; while (${count}-- > 0) { ${block(
							body,
							3
						)} } }`
					: `{ let ${count} = ${below(3)}; do { ${block(
							body,
							3
						)} } while (${count}-- > 0); }`;
			}
			case 12: {
				const body = inner(context, { inSwitch: true });
				const cases = [];
				for (let i = below(3); i >= 0; i--) {
					cases.push(`case ${literal()}: ${block(inner(body, {}), 2)}`);
				}
				if (chance(0.5)) cases.push(`default: ${block(inner(body, {}), 2)}`);
				return `switch (${expression(context, 2)}) { ${cases.join(" ")} }`;
			}
			case 13: {
				const error = fresh("e");
				const handler = inner(context, {});
				// An error's message names what threw, as mangling renames it.
				handler.bindings.push({ name: error, kind: "caught" });
				const thrown = chance(0.4) ? `throw ${expression(context, 2)};` : "";
				const binding = chance(0.7);
				return `try { ${block(inner(context, {}), 2)} ${thrown} } catch${
					binding ? ` (${error})` : ""
				} { _print("caught"${binding ? `, _error(${error})` : ""}); ${block(
					binding ? handler : inner(context, {}),
					1
				)} }${chance(0.3) ? ' finally { _print("finally"); }' : ""}`;
			}
			case 14: {
				const label = fresh("L");
				const body = inner(context, { labels: [...context.labels, label] });
				return `${label}: { ${block(body, 3)} }`;
			}
			case 15:
			case 16: {
				// A sloppy function in a block is a `var` only once its statement
				// runs, which the minifier, as terser's, hoists past a throw.
				if (!context.scopeTop && !context.strict) {
					return `_print(${call(context, 3)});`;
				}
				const name = fresh("fn");
				const body = functionContext(context);
				const params = parameters(body, 2);
				context.bindings.push({ name, kind: "function" });
				body.bindings.push({ name, kind: "function" });
				return `function ${name}(${params}) { ${guard()} ${block(
					body,
					3
				)} return ${expression(body, 2)}; }`;
			}
			case 17: {
				const name = fresh("gen");
				const body = functionContext(context);
				// A default reads neither `yield` nor `await`.
				const params = parameters(body, 2);
				body.inGenerator = true;
				context.bindings.push({ name, kind: "generator" });
				const delegate = chance(0.3) ? `yield* ${array(body, 2)};` : "";
				return `function* ${name}(${params}) { ${guard()} yield ${expression(
					body,
					2
				)}; ${block(body, 2)} ${delegate} return ${expression(body, 1)}; }`;
			}
			case 18: {
				const name = fresh("as");
				const body = functionContext(context);
				// A default reads neither `yield` nor `await`.
				const params = parameters(body, 2);
				body.inAsync = true;
				const args = callArguments(context, 2);
				return `async function ${name}(${params}) { ${guard()} ${block(
					body,
					3
				)} return ${expression(
					body,
					2
				)}; }\n${name}(${args}).then((v) => _print("resolved", v), (e) => _print("rejected", _error(e)));`;
			}
			case 19:
			case 20: {
				const name = fresh("C");
				const body = classBody(context, 3);
				context.bindings.push({ name, kind: "class" });
				const instance = fresh("o");
				const args = callArguments(context, 2);
				context.bindings.push({ name: instance, kind: "let" });
				return `class ${name}${body}\nlet ${instance} = new ${name}(${args});\n_print(${instance});`;
			}
			case 21:
				return chance(0.3)
					? `_print((${pick(BIGINTS)}) ${pick(BIGINT_BINARY)} (${pick(
							BIGINTS
						)}));`
					: `{ ${block(inner(context, {}), 3)} }`;
			case 22: {
				const instance = pickBinding(context, (b) => /^o\d/.test(b.name));
				if (instance === undefined) return `_print(${call(context, 3)});`;
				return `_print(${instance.name}?.${pick(METHODS)}?.(), ${
					instance.name
				}?.has?.(${expression(context, 2)}));`;
			}
			default:
				return `_print(${call(context, 3)});`;
		}
	};

	/**
	 * Imports of `dep`'s exports in every form, joined to the context as what
	 * they bind: read-only values, a function, a class and a namespace.
	 * @param {Context} context the program's context
	 * @returns {string} the declarations
	 */
	const imports = (context) => {
		const declarations = [];
		const named = [];
		for (const [name, kind] of /** @type {[string, Binding["kind"]][]} */ ([
			["counter", "const"],
			["bump", "function"],
			["list", "const"],
			["alias", "const"],
			["object", "const"]
		])) {
			if (!chance(0.5)) continue;
			const local = chance(0.5) ? fresh("i") : name;
			named.push(local === name ? name : `${name} as ${local}`);
			context.bindings.push({ name: local, kind });
		}
		const dep = chance(0.5) ? fresh("Dep") : undefined;
		if (dep !== undefined) context.bindings.push({ name: dep, kind: "class" });
		if (dep !== undefined || named.length > 0) {
			const clauses = [
				...(dep === undefined ? [] : [dep]),
				...(named.length === 0 ? [] : [`{ ${named.join(", ")} }`])
			];
			declarations.push(`import ${clauses.join(", ")} from "dep";`);
		}
		if (chance(0.5)) {
			const namespace = fresh("ns");
			context.bindings.push({ name: namespace, kind: "namespace" });
			declarations.push(`import * as ${namespace} from "dep";`);
		}
		return declarations.join("\n");
	};

	/**
	 * Exports, under new names, of what the program's top level still binds,
	 * a default, and `dep`'s re-exported.
	 * @param {Context} context the program's context
	 * @returns {string[]} the declarations
	 */
	const exports = (context) => {
		const declarations = [];
		const local = context.bindings.filter(
			(b) =>
				b.kind !== "namespace" &&
				!/^(?:counter|bump|list|alias|object)$/.test(b.name)
		);
		const specifiers = [];
		for (let i = below(3); i > 0 && local.length > 0; i--) {
			specifiers.push(`${pick(local).name} as ${fresh("x")}`);
		}
		if (specifiers.length > 0) {
			declarations.push(`export { ${specifiers.join(", ")} };`);
		}
		if (chance(0.4)) {
			declarations.push(`export default ${expression(context, 2)};`);
		}
		const reexport = below(4);
		if (reexport === 0) {
			declarations.push('export * from "dep";');
		} else if (reexport === 1) {
			declarations.push(`export * as ${fresh("re")} from "dep";`);
		} else if (reexport === 2) {
			declarations.push(
				`export { bump as ${fresh("re")}, default as ${fresh("re")} } from "dep";`
			);
		}
		return declarations;
	};

	/**
	 * A program shaped as webpack writes a bundle: a module map, the
	 * `__webpack_require__` runtime, ES modules exporting through getters,
	 * CommonJS modules and an entry requiring them, bodies written at random.
	 * @param {Context} root the program's context
	 * @returns {string} the bundle
	 */
	const bundle = (root) => {
		const strict = chance(0.5);
		/** @type {string[]} */
		const modules = [];
		/** @type {{ id: number, esm: boolean }[]} */
		const written = [];
		for (let k = below(3) + 2; k > 0; k--) {
			const id = 100 + written.length;
			const esm = chance(0.6);
			// A module is an arrow: no `arguments` or `new.target` of its own.
			const body = {
				...functionContext(root),
				strict: root.strict || strict,
				hasArguments: false,
				hasNewTarget: false
			};
			/** @type {string[]} */
			const lines = [];
			for (const other of written) {
				if (!chance(0.6)) continue;
				const name = `_m${other.id}__WEBPACK_IMPORTED_MODULE_${lines.length}__`;
				lines.push(`var ${name} = __webpack_require__(${other.id});`);
				if (other.esm) {
					lines.push(
						`_print((0, ${name}.f)(${expression(body, 1)}), ${name}["default"], ${name}.__esModule);`
					);
				} else {
					const interop = fresh("n");
					lines.push(
						`var ${interop} = __webpack_require__.n(${name});`,
						`_print(${name}.a, typeof ${interop}(), ${interop}.a === ${interop}());`
					);
				}
			}
			const value = expression(body, 2);
			const fn = fresh("f");
			const fnBody = functionContext(body);
			const parameter = fresh("p");
			fnBody.bindings.push({ name: parameter, kind: "param" });
			// A throw ends the module's own statements, not the bundle.
			lines.push(
				`try { ${block(inner(body, {}), 3)} } catch (e) { _print("module", _error(e)); }`
			);
			if (esm) {
				const exported = fresh("d");
				modules.push(
					`${id}: ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, { f: () => (${fn}), "default": () => (${exported}) });
${lines.join("\n")}
function ${fn}(${parameter}) { ${guard()} return ${expression(fnBody, 2)}; }
const ${exported} = (${value});
})`
				);
			} else {
				modules.push(
					`${id}: ((module, __unused_webpack_exports, __webpack_require__) => {
${lines.join("\n")}
module.exports = { a: ${value}, f: function ${fn}(${parameter}) { ${guard()} return ${expression(fnBody, 2)}; } };
})`
				);
			}
			written.push({ id, esm });
		}
		const entry = {
			...functionContext(root),
			strict: root.strict || strict,
			hasArguments: false,
			hasNewTarget: false
		};
		const uses = written.map(
			({ id, esm }) =>
				`try { ${
					esm
						? `var e${id} = __webpack_require__(${id}); _print((0, e${id}.f)(${expression(entry, 1)}), e${id}["default"], Object.keys(e${id}));`
						: `var e${id} = __webpack_require__(${id}); _print(e${id}.a, e${id}.f(${expression(entry, 1)}));`
				} } catch (e) { _print("entry", _error(e)); }`
		);
		return `(() => { ${strict ? '"use strict"; ' : ""}
var __webpack_modules__ = ({
${modules.join(",\n")}
});
var __webpack_module_cache__ = {};
function __webpack_require__(moduleId) {
var cachedModule = __webpack_module_cache__[moduleId];
if (cachedModule !== undefined) return cachedModule.exports;
var module = __webpack_module_cache__[moduleId] = { exports: {} };
__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
return module.exports;
}
(() => { __webpack_require__.d = (exports, definition) => { for (var key in definition) { if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) { Object.defineProperty(exports, key, { enumerable: true, get: definition[key] }); } } }; })();
(() => { __webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop)); })();
(() => { __webpack_require__.r = (exports) => { if (typeof Symbol !== "undefined" && Symbol.toStringTag) { Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" }); } Object.defineProperty(exports, "__esModule", { value: true }); }; })();
(() => { __webpack_require__.n = (module) => { var getter = module && module.__esModule ? () => (module["default"]) : () => (module); __webpack_require__.d(getter, { a: getter }); return getter; }; })();
var __webpack_exports__ = {};
(() => {
${uses.join("\n")}
})();
})();`;
	};

	return () => {
		counter = 0;
		// Half are modules. ufuzz runs every program inside a function, which gives
		// it `arguments`; half the scripts are, the rest keep top-level names.
		const isModule = chance(0.5);
		const isBundle = !isModule && chance(0.25);
		const wrapped = !isModule && !isBundle && chance(0.5);
		/** @type {Context} */
		const context = {
			bindings: [
				{ name: "a", kind: "var" },
				{ name: "b", kind: "var" }
			],
			depth: 0,
			inFunction: false,
			inGenerator: false,
			inAsync: isModule,
			inLoop: false,
			inSwitch: false,
			inClass: false,
			strict: isModule,
			hasArguments: wrapped,
			hasNewTarget: wrapped,
			module: isModule,
			scopeTop: true,
			labels: [],
			loopLabels: []
		};
		if (isBundle) {
			return {
				code: `${PRELUDE}${bundle(context)}\n_print(null, a, b, c);\n`,
				module: false
			};
		}
		/** @type {string[]} */
		const statements = [];
		if (isModule && chance(0.7)) statements.push(imports(context));
		const count = 6 + below(8);
		for (let i = 0; i < count; i++) {
			const declared = context.bindings.length;
			const written = statement(context);
			const declaredFunction = context.bindings
				.slice(declared)
				.some((binding) => binding.kind === "function");
			if (
				declaredFunction ||
				(context.bindings.length > declared && chance(0.5))
			) {
				const exported =
					isModule &&
					chance(0.4) &&
					/^(?:let|const|var|function|class|async function)\b/.test(written);
				statements.push(exported ? `export ${written}` : written);
				continue;
			}
			// What a `try` block declares is out of scope after it, but for `var`.
			context.bindings = context.bindings.filter(
				(binding, index) => index < declared || binding.kind === "var"
			);
			statements.push(
				`try { ${written} } catch (e) { _print("top", _error(e)); }`
			);
		}
		if (isModule) statements.push(...exports(context));
		const body = `${statements.join("\n")}\n_print(null, a, b, c);`;
		return {
			code: `${PRELUDE}${wrapped ? `!function () {\n${body}\n}();` : body}\n`,
			module: isModule
		};
	};
};

// Pieces of a pattern, valid and broken alike: escapes, classes, `v`-mode set
// operations, groups and assertions, quantifiers and stray brackets.
const REGEXP_ATOMS = [
	"a",
	"Z",
	".",
	"^",
	"$",
	"|",
	"\\d",
	"\\W",
	"\\b",
	"\\B",
	"\\cJ",
	"\\c1",
	"\\x41",
	"\\x4",
	"\\u0041",
	"\\u{1F600}",
	"\\u{110000}",
	"\\ud83d\\ude00",
	"\\0",
	"\\07",
	"\\1",
	"\\9",
	"\\k<n>",
	"\\k",
	"\\p{L}",
	"\\P{Script=Greek}",
	"\\p{Script_Extensions=Latn}",
	"\\p{RGI_Emoji}",
	"\\p{Unknown}",
	"\\-",
	"\\/",
	"\\q{ab|c}",
	"[a-z]",
	"[^\\d_]",
	"[z-a]",
	"[\\d-z]",
	"[]",
	"[^]",
	"[[a-z]--[aeiou]]",
	"[\\w&&\\d]",
	"[a&&&b]",
	"[\\q{abc|d}x]",
	"[(]",
	"(",
	")",
	"[",
	"]",
	"{",
	"}",
	"*",
	"+",
	"?",
	"{2}",
	"{2,}",
	"{2,3}",
	"{3,2}",
	"{,2}",
	"*?",
	"+?",
	"??",
	"{1,2}?"
];
/** @type {[string, string][]} */
const REGEXP_GROUPS = [
	["(", ")"],
	["(?:", ")"],
	["(?<n>", ")"],
	["(?<m>", ")"],
	["(?=", ")"],
	["(?!", ")"],
	["(?<=", ")"],
	["(?<!", ")"],
	["(?i:", ")"],
	["(?-s:", ")"],
	["(?ii:", ")"],
	["(?<n>", ")|(?<n>a)"]
];
const REGEXP_FLAGS = [
	"",
	"g",
	"i",
	"m",
	"s",
	"y",
	"d",
	"u",
	"v",
	"gimsuyd",
	"uv",
	"gg",
	"x"
];

/**
 * A generator of regular expression literals for a seed, about half of which
 * no engine reads, for the parser to accept and refuse as the engine does.
 * @param {number} seed the seed
 * @returns {() => string} the next literal per call
 */
const createRegExpGenerator = (seed) => {
	const random = createRandom(seed);
	const pick = (/** @type {string[]} */ list) =>
		list[Math.floor(random() * list.length)];
	/**
	 * @param {number} depth how deep groups may still nest
	 * @returns {string} a pattern
	 */
	const pattern = (depth) => {
		let text = "";
		const length = 1 + Math.floor(random() * 4);
		for (let i = 0; i < length; i++) {
			if (depth > 0 && random() < 0.3) {
				const [open, close] =
					REGEXP_GROUPS[Math.floor(random() * REGEXP_GROUPS.length)];
				text += `${open}${pattern(depth - 1)}${close}`;
			} else {
				text += pick(REGEXP_ATOMS);
			}
		}
		return text;
	};
	return () => `/${pattern(2)}/${pick(REGEXP_FLAGS)}`;
};

/**
 * A generator of CommonJS sources for a seed, mixing `require("…")` calls with
 * what only looks like one: text in strings, comments, templates and regular
 * expressions, member calls, other arguments. A `/` follows only what the scan
 * reads as before an operand or before a value, never `)`, `]`, `}`, `++` or a
 * comment, where its documented guess may go wrong.
 * @param {number} seed the seed
 * @returns {() => string} the next source per call
 */
const createRequireSourceGenerator = (seed) => {
	const random = createRandom(seed);
	let counter = 0;
	const pick = (/** @type {(() => string)[]} */ list) =>
		list[Math.floor(random() * list.length)]();
	/** @returns {string} a specifier, sometimes spelled with escapes */
	const specifier = () => {
		const name = `m${counter++}`;
		return random() < 0.2
			? `"\\x2e/${name}"`
			: random() < 0.5
				? `"${name}"`
				: `'${name}'`;
	};
	/**
	 * @param {number} depth how deep it may still nest
	 * @returns {string} an expression
	 */
	const expression = (depth) =>
		pick([
			() => `require(${specifier()})`,
			() => `require ( ${specifier()} )`,
			() => `require(/* c */ ${specifier()})`,
			() => `require((${specifier()}))`,
			() => `require\n(${specifier()})`,
			() => `x.require(${specifier()})`,
			() => `x?.require(${specifier()})`,
			() => `require?.(${specifier()})`,
			() => `[...require(${specifier()})]`,
			() => `require(${specifier()}, 1)`,
			() => "require(name)",
			() => "require(`t`)",
			() => `"require('s${counter++}')"`,
			() => `'a\\'require("s${counter++}")'`,
			() => '/require\\("x"\\)[/"]/g',
			() => `4 / 2 / require(${specifier()})`,
			() => `({ require: ${specifier()} }).require`,
			() =>
				depth > 0
					? `\`a\${${expression(depth - 1)}}require("no")\${"}"}\\\${\``
					: '"leaf"',
			() => (depth > 0 ? `(() => { ${statement(depth - 1)} })` : '"leaf"'),
			() =>
				depth > 0 ? `[${expression(depth - 1)}, ${expression(depth - 1)}]` : "0"
		]);
	/**
	 * @param {number} depth how deep it may still nest
	 * @returns {string} a statement
	 */
	const statement = (depth) =>
		pick([
			() => `${expression(depth)};`,
			() => `var v${counter++} = ${expression(depth)};`,
			() => `// require(${specifier()})\n`,
			() => `/* require(${specifier()}) */`,
			() =>
				depth > 0 ? `{ ${statement(depth - 1)} ${statement(depth - 1)} }` : ";",
			() =>
				depth > 0
					? `function f${counter++}() { return ${expression(depth - 1)}; }`
					: ";",
			() => (depth > 0 ? `if (x) { ${statement(depth - 1)} }` : ";")
		]);
	return () => {
		const statements = [];
		for (let i = 1 + Math.floor(random() * 6); i > 0; i--) {
			statements.push(statement(2));
		}
		return statements.join("\n");
	};
};

module.exports = {
	DEPENDENCY,
	createProgramGenerator,
	createRandom,
	createRegExpGenerator,
	createRequireSourceGenerator
};
