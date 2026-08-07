"use strict";

const acorn = require("acorn");
const { collectCjsRequireSpecifiers } = require("../lib/javascript/syntax");

/**
 * The AST-based reference the scanner replaces.
 * @param {string} source source code
 * @returns {Set<string>} required specifiers
 */
const withAcorn = (source) => {
	/** @type {Set<string>} */
	const requires = new Set();
	const ast = acorn.parse(source, {
		ecmaVersion: "latest",
		sourceType: "script",
		allowReturnOutsideFunction: true
	});
	/** @type {EXPECTED_ANY[]} */
	const stack = [ast];
	while (stack.length > 0) {
		const node = stack.pop();
		if (!node || typeof node.type !== "string") continue;
		if (
			node.type === "CallExpression" &&
			node.callee.type === "Identifier" &&
			node.callee.name === "require" &&
			node.arguments.length === 1 &&
			node.arguments[0].type === "Literal" &&
			typeof node.arguments[0].value === "string"
		) {
			requires.add(node.arguments[0].value);
		}
		for (const key of Object.keys(node)) {
			const value = node[key];
			if (Array.isArray(value)) {
				for (const item of value) {
					if (item && typeof item.type === "string") stack.push(item);
				}
			} else if (value && typeof value.type === "string") {
				stack.push(value);
			}
		}
	}
	return requires;
};

// eslint forbids a literal "${" in a string, so the substitution is built
const OPEN = `$${"{"}`;

describe("collectCjsRequireSpecifiers", () => {
	const cases = [
		["plain", 'const a = require("./a");'],
		["double and single quotes", "require(\"./a\"); require('./b');"],
		["repeated specifier", 'require("./a"); require("./a");'],
		["whitespace and newlines", 'require(\n\t"./a"\n);'],
		["comment between tokens", 'require/* c */("./a");'],
		["line comment holding a call", '// require("./nope")\nrequire("./a");'],
		["block comment holding a call", '/* require("./nope") */ require("./a");'],
		[
			"string holding a call",
			'const s = "require(\'./nope\')"; require("./a");'
		],
		[
			"template holding a call",
			'const s = `require("./nope")`; require("./a");'
		],
		[
			"template substitution is code",
			`const s = \`x${OPEN}require('./a')}y\`; require('./b');`
		],
		["member access is not a call", 'foo.require("./nope"); require("./a");'],
		["longer identifier", 'requireX("./nope"); require("./a");'],
		["identifier ending in require", 'preRequire("./nope"); require("./a");'],
		["nested call", 'f(require("./a"), require("./b"));'],
		[
			"escaped quote in a skipped string",
			'const s = "a\\"require(\'./nope\')"; require("./a");'
		],
		["division is not a regexp", 'const x = a / b; require("./a");'],
		[
			"regexp holding a call",
			'const r = /require\\("\\.\\/nope"\\)/; require("./a");'
		],
		["regexp class with a slash", 'const r = /[/]/; require("./a");'],
		["return before a regexp", 'function f() { return /a/; }\nrequire("./a");'],
		["dynamic specifier is not static", 'require(name); require("./a");'],
		[
			"concatenated specifier is not static",
			'require("./a" + x); require("./b");'
		],
		["template specifier is static", "require(`./a`);"],
		[
			"template specifier with substitution",
			`require(\`./${OPEN}x}\`); require('./b');`
		]
	];

	for (const [name, source] of cases) {
		it(`should match the ast for ${name}`, () => {
			expect([...collectCjsRequireSpecifiers(source)].sort()).toEqual(
				[...withAcorn(source)].sort()
			);
		});
	}

	it("should read webpack's own sources the same way as the ast", () => {
		const fs = require("fs");
		const path = require("path");

		const dir = path.resolve(__dirname, "../lib");
		/** @type {string[]} */
		const files = [];
		/**
		 * @param {string} d directory
		 */
		const walk = (d) => {
			for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
				const p = path.join(d, entry.name);
				if (entry.isDirectory()) walk(p);
				else if (entry.name.endsWith(".js")) files.push(p);
			}
		};
		walk(dir);
		expect(files.length).toBeGreaterThan(400);
		for (const file of files) {
			const source = fs.readFileSync(file, "utf8");
			expect([
				`${path.relative(dir, file)}`,
				[...collectCjsRequireSpecifiers(source)].sort()
			]).toEqual([
				`${path.relative(dir, file)}`,
				[...withAcorn(source)].sort()
			]);
		}
	});
});
