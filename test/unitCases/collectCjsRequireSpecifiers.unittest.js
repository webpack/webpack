"use strict";

const { fixture } = require("../helpers/fixture");

const acorn = require("acorn");
const { collectCjsRequireSpecifiers } = require("../../lib/javascript/syntax-parser");

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


describe("collectCjsRequireSpecifiers", () => {
	const cases = [
		["plain", fixture("javascript", "collect-cjs-require-specifiers-cases-plain")],
		["double and single quotes", fixture("javascript", "collect-cjs-require-specifiers-cases-double-and-single-quotes")],
		["repeated specifier", fixture("javascript", "collect-cjs-require-specifiers-cases-repeated-specifier")],
		["whitespace and newlines", fixture("javascript", "collect-cjs-require-specifiers-cases-whitespace-and-newlines")],
		["comment between tokens", fixture("javascript", "collect-cjs-require-specifiers-cases-comment-between-tokens")],
		["line comment holding a call", fixture("javascript", "collect-cjs-require-specifiers-cases-line-comment-holding-a-call")],
		["block comment holding a call", fixture("javascript", "collect-cjs-require-specifiers-cases-block-comment-holding-a-call")],
		[
			"string holding a call",
			fixture("javascript", "collect-cjs-require-specifiers-cases-string-holding-a-call")
		],
		[
			"template holding a call",
			fixture("javascript", "collect-cjs-require-specifiers-cases-template-holding-a-call")
		],
		[
			"template substitution is code",
			fixture("javascript", "collect-cjs-require-specifiers-cases-template-substitution-is-code")
		],
		["member access is not a call", fixture("javascript", "collect-cjs-require-specifiers-cases-member-access-is-not-a-call")],
		["a longer name is not a call", fixture("javascript", "collect-cjs-require-specifiers-cases-a-longer-name-is-not-a-call")],
		[
			"optional member access is not a call",
			fixture("javascript", "collect-cjs-require-specifiers-cases-optional-member-access-is-not-a-call")
		],
		["spread into an object", fixture("javascript", "collect-cjs-require-specifiers-cases-spread-into-an-object")],
		["spread into an array", fixture("javascript", "collect-cjs-require-specifiers-cases-spread-into-an-array")],
		["spread into a call", fixture("javascript", "collect-cjs-require-specifiers-cases-spread-into-a-call")],
		[
			"spread beside a member access",
			fixture("javascript", "collect-cjs-require-specifiers-cases-spread-beside-a-member-access")
		],
		["longer identifier", fixture("javascript", "collect-cjs-require-specifiers-cases-longer-identifier")],
		["identifier ending in require", fixture("javascript", "collect-cjs-require-specifiers-cases-identifier-ending-in-require")],
		["nested call", fixture("javascript", "collect-cjs-require-specifiers-cases-nested-call")],
		[
			"escaped quote in a skipped string",
			fixture("javascript", "collect-cjs-require-specifiers-cases-escaped-quote-in-a-skipped-string")
		],
		["division is not a regexp", fixture("javascript", "collect-cjs-require-specifiers-cases-division-is-not-a-regexp")],
		[
			"regexp holding a call",
			fixture("javascript", "collect-cjs-require-specifiers-cases-regexp-holding-a-call")
		],
		["regexp class with a slash", fixture("javascript", "collect-cjs-require-specifiers-cases-regexp-class-with-a-slash")],
		["return before a regexp", fixture("javascript", "collect-cjs-require-specifiers-cases-return-before-a-regexp")],
		[
			"await before a regexp",
			fixture("javascript", "collect-cjs-require-specifiers-cases-await-before-a-regexp")
		],
		["dynamic specifier is not static", fixture("javascript", "collect-cjs-require-specifiers-cases-dynamic-specifier-is-not-static")],
		[
			"concatenated specifier is not static",
			fixture("javascript", "collect-cjs-require-specifiers-cases-concatenated-specifier-is-not-static")
		],
		["template specifier is not collected", fixture("javascript", "collect-cjs-require-specifiers-cases-template-specifier-is-not-collected")],
		[
			"template specifier with substitution is not collected",
			fixture("javascript", "collect-cjs-require-specifiers-cases-template-specifier-with-substitution-is-not")
		],
		["escape in the specifier", fixture("javascript", "collect-cjs-require-specifiers-cases-escape-in-the-specifier")],
		["backslash in the specifier", fixture("javascript", "collect-cjs-require-specifiers-cases-backslash-in-the-specifier")],
		["hex escape in the specifier", fixture("javascript", "collect-cjs-require-specifiers-cases-hex-escape-in-the-specifier")],
		["unicode escape in the specifier", fixture("javascript", "collect-cjs-require-specifiers-cases-unicode-escape-in-the-specifier")],
		["code point escape in the specifier", fixture("javascript", "collect-cjs-require-specifiers-cases-code-point-escape-in-the-specifier")],
		["octal escape in the specifier", fixture("javascript", "collect-cjs-require-specifiers-cases-octal-escape-in-the-specifier")],
		["out of range octal escape", fixture("javascript", "collect-cjs-require-specifiers-cases-out-of-range-octal-escape")],
		["non-octal digit escape in the specifier", fixture("javascript", "collect-cjs-require-specifiers-cases-non-octal-digit-escape-in-the-specifier")],
		["quote escape in the specifier", fixture("javascript", "collect-cjs-require-specifiers-cases-quote-escape-in-the-specifier")],
		["line continuation in the specifier", fixture("javascript", "collect-cjs-require-specifiers-cases-line-continuation-in-the-specifier")],
		["carriage return line continuation", fixture("javascript", "collect-cjs-require-specifiers-cases-carriage-return-line-continuation")],
		["bare carriage return line continuation", fixture("javascript", "collect-cjs-require-specifiers-cases-bare-carriage-return-line-continuation")],
		["line separator line continuation", fixture("javascript", "collect-cjs-require-specifiers-cases-line-separator-line-continuation")],
		["escape after the specifier", fixture("javascript", "collect-cjs-require-specifiers-cases-escape-after-the-specifier")]
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
				fixture("javascript", "collect-cjs-require-specifiers-malformed-source-malformed-regexp-at-the-very"),
				["./a"]
			],
			[
				"line comment before the call parens",
				fixture("javascript", "collect-cjs-require-specifiers-malformed-source-malformed-line-comment-before"),
				["./a"]
			],
			["unterminated line comment", fixture("javascript", "collect-cjs-require-specifiers-malformed-source-malformed-unterminated-line"), ["./a"]],
			["unterminated line comment after require", fixture("javascript", "collect-cjs-require-specifiers-malformed-source-malformed-unterminated-line-2"), []],
			["unterminated block comment after require", fixture("javascript", "collect-cjs-require-specifiers-malformed-source-malformed-unterminated-block"), []],
			["unterminated string", fixture("javascript", "collect-cjs-require-specifiers-malformed-source-malformed-unterminated-string"), ["./a"]],
			[
				"newline inside a string",
				fixture("javascript", "collect-cjs-require-specifiers-malformed-source-malformed-newline-inside-a"),
				["./a"]
			],
			["unterminated template", fixture("javascript", "collect-cjs-require-specifiers-malformed-source-malformed-unterminated-template"), ["./a"]],
			["unterminated regexp", fixture("javascript", "collect-cjs-require-specifiers-malformed-source-malformed-unterminated-regexp"), ["./a"]],
			["unterminated call", fixture("javascript", "collect-cjs-require-specifiers-malformed-source-malformed-unterminated-call"), ["./a"]],
			["empty source", fixture("javascript", "collect-cjs-require-specifiers-malformed-source-malformed-empty-source"), []],
			[
				"newline in the specifier",
				fixture("javascript", "collect-cjs-require-specifiers-malformed-source-malformed-newline-in-the"),
				["./c"]
			],
			[
				"newline after an escape in the specifier",
				fixture("javascript", "collect-cjs-require-specifiers-malformed-source-malformed-newline-after-an"),
				["./d"]
			],
			[
				"invalid hex escape in the specifier",
				fixture("javascript", "collect-cjs-require-specifiers-malformed-source-malformed-invalid-hex-escape-in"),
				["./c"]
			],
			[
				"invalid unicode escape in the specifier",
				fixture("javascript", "collect-cjs-require-specifiers-malformed-source-malformed-invalid-unicode"),
				["./c"]
			],
			[
				"backslash at the end of the specifier",
				fixture("javascript", "collect-cjs-require-specifiers-malformed-source-malformed-backslash-at-the-end"),
				["./a"]
			],
			[
				"unterminated code point escape",
				fixture("javascript", "collect-cjs-require-specifiers-malformed-source-malformed-unterminated-code"),
				["./c"]
			],
			[
				"empty code point escape",
				fixture("javascript", "collect-cjs-require-specifiers-malformed-source-malformed-empty-code-point"),
				["./c"]
			],
			[
				"out of range code point escape",
				fixture("javascript", "collect-cjs-require-specifiers-malformed-source-malformed-out-of-range-code"),
				["./c"]
			],
			[
				"backslash at the end of source",
				fixture("javascript", "collect-cjs-require-specifiers-malformed-source-malformed-backslash-at-the-end-2"),
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

		const dir = path.resolve(__dirname, "../../lib");
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
