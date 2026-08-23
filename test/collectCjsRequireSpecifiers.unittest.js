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
	/** @type {any[]} */
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
		[
			"await before a regexp",
			'async function f() { await /require\\("\\.\\/nope"\\)/.test(s); }\nrequire("./a");'
		],
		["dynamic specifier is not static", 'require(name); require("./a");'],
		[
			"concatenated specifier is not static",
			'require("./a" + x); require("./b");'
		],
		["template specifier is not collected", "require(`./a`);"],
		[
			"template specifier with substitution is not collected",
			`require(\`./${OPEN}x}\`); require('./b');`
		],
		["escape in the specifier", 'require("./a\\tb"); require("./c");'],
		["backslash in the specifier", 'require("..\\\\lib\\\\a");'],
		["hex escape in the specifier", 'require("\\x2e/a");'],
		["unicode escape in the specifier", 'require("\\u002E/a");'],
		["code point escape in the specifier", 'require("\\u{2e}/a");'],
		["octal escape in the specifier", 'require("\\56/a");'],
		["out of range octal escape", 'require("\\777/a");'],
		["non-octal digit escape in the specifier", 'require("\\8./a");'],
		["quote escape in the specifier", 'require("./a\\"b"); require("./c");'],
		["line continuation in the specifier", 'require("./a\\\nb");'],
		["carriage return line continuation", 'require("./a\\\r\nb");'],
		["bare carriage return line continuation", 'require("./a\\\rb");'],
		["line separator line continuation", 'require("./a\\\u2028b");'],
		["escape after the specifier", 'require("./a"); const s = "b\\tc";']
	];

	for (const [name, source] of cases) {
		it(`should match the ast for ${name}`, () => {
			expect([...collectCjsRequireSpecifiers(source)].sort()).toEqual(
				[...withAcorn(source)].sort()
			);
		});
	}

	// The scanner reads whatever is on disk, so it must terminate on source the
	// ast reference cannot parse at all — asserted directly, not differentially.
	describe("malformed source", () => {
		/** @type {[string, string, string[]][]} */
		const malformed = [
			[
				"regexp at the very start",
				'/require\\("\\.\\/nope"\\)/;\nrequire("./a");',
				["./a"]
			],
			[
				"line comment before the call parens",
				'require // c\n("./a");',
				["./a"]
			],
			["unterminated line comment", 'require("./a"); // trailing', ["./a"]],
			["unterminated line comment after require", "require // trailing", []],
			["unterminated block comment after require", "require /* trailing", []],
			["unterminated string", 'require("./a"); const s = "abc', ["./a"]],
			[
				"newline inside a string",
				'require("./a"); const s = "ab\nc";',
				["./a"]
			],
			["unterminated template", 'require("./a"); const s = `abc', ["./a"]],
			["unterminated regexp", 'require("./a"); const r = /ab\nc;', ["./a"]],
			["unterminated call", 'require("./a"); require("./b', ["./a"]],
			["empty source", "", []],
			[
				"newline in the specifier",
				'require("./a\nb"); require("./c");',
				["./c"]
			],
			[
				"newline after an escape in the specifier",
				'require("./a\\tb\nc"); require("./d");',
				["./d"]
			],
			[
				"invalid hex escape in the specifier",
				'require("\\x2z/a"); require("./c");',
				["./c"]
			],
			[
				"invalid unicode escape in the specifier",
				'require("\\u00zz/a"); require("./c");',
				["./c"]
			],
			[
				"backslash at the end of the specifier",
				'require("./a"); require("./b\\',
				["./a"]
			],
			[
				"unterminated code point escape",
				'require("\\u{2e/a"); require("./c");',
				["./c"]
			],
			[
				"empty code point escape",
				'require("\\u{}/a"); require("./c");',
				["./c"]
			],
			[
				"out of range code point escape",
				'require("\\u{110000}/a"); require("./c");',
				["./c"]
			],
			[
				"backslash at the end of source",
				'require("./a"); const s = "b\\',
				["./a"]
			]
		];

		for (const [name, source, expected] of malformed) {
			it(`should terminate on ${name}`, () => {
				expect([...collectCjsRequireSpecifiers(source)].sort()).toEqual(
					expected
				);
			});
		}
	});

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
		expect(files.length).toBeGreaterThan(100);
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
