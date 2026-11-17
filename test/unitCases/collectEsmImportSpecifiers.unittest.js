/*
	Sources under test/fixtures/javascript/collect-esm-import-specifiers-es-module-lexer-*
	are es-module-lexer's own test inputs (https://github.com/guybedford/es-module-lexer).

	MIT License, Copyright (C) 2018-2022 Guy Bedford

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

"use strict";

const fs = require("fs");
const path = require("path");
const { fixture } = require("../helpers/fixture");

const {
	A,
	NodeType,
	collectEsmImportSpecifiers,
	parseProgram,
	toEstreeObject
} = require("../../lib/javascript/syntax").parser;

/**
 * The reference the scan stands in for: webpack's own parser, reading each
 * import, re-export and dynamic import from the tree.
 * @param {string} source source code
 * @returns {Map<string, boolean>} each specifier, mapped to whether only `import()` names it
 */
const withParser = (source) => {
	/** @type {Map<string, boolean>} */
	const specifiers = new Map();
	/**
	 * @param {string} specifier the specifier
	 * @param {boolean} dynamic whether `import()` names it
	 */
	const add = (specifier, dynamic) => {
		if (!dynamic || !specifiers.has(specifier)) {
			specifiers.set(specifier, dynamic);
		}
	};
	const program = parseProgram(source, 0, { sourceType: "module" });
	A.findNode(program, (node) => {
		const type = A.type(node);
		if (
			type === NodeType.ImportDeclaration ||
			type === NodeType.ExportNamedDeclaration ||
			type === NodeType.ExportAllDeclaration
		) {
			const { source: specifier } =
				/** @type {import("estree").ImportDeclaration | import("estree").ExportNamedDeclaration} */ (
					toEstreeObject(node)
				);
			if (specifier) add(/** @type {string} */ (specifier.value), false);
		} else if (type === NodeType.ImportExpression) {
			const { source: argument } =
				/** @type {import("estree").ImportExpression} */ (toEstreeObject(node));
			if (argument.type === "Literal" && typeof argument.value === "string") {
				add(argument.value, true);
			} else if (
				argument.type === "TemplateLiteral" &&
				argument.expressions.length === 0 &&
				typeof argument.quasis[0].value.cooked === "string"
			) {
				add(argument.quasis[0].value.cooked, true);
			}
		}
		return undefined;
	});
	return specifiers;
};

describe("collectEsmImportSpecifiers", () => {
	const cases = [
		["default import", fixture("javascript", "collect-esm-import-specifiers-cases-default-import")],
		["named imports", fixture("javascript", "collect-esm-import-specifiers-cases-named-imports")],
		["string import names", fixture("javascript", "collect-esm-import-specifiers-cases-string-import-names")],
		["namespace import", fixture("javascript", "collect-esm-import-specifiers-cases-namespace-import")],
		["default and namespace", fixture("javascript", "collect-esm-import-specifiers-cases-default-and-namespace")],
		["default and named", fixture("javascript", "collect-esm-import-specifiers-cases-default-and-named")],
		["bare import", fixture("javascript", "collect-esm-import-specifiers-cases-bare-import")],
		["import attributes", fixture("javascript", "collect-esm-import-specifiers-cases-import-attributes")],
		["a binding named from", fixture("javascript", "collect-esm-import-specifiers-cases-a-binding-named-from")],
		["comment inside the clause", fixture("javascript", "collect-esm-import-specifiers-cases-comment-inside-the-clause")],
		["export all", fixture("javascript", "collect-esm-import-specifiers-cases-export-all")],
		["export all as a name", fixture("javascript", "collect-esm-import-specifiers-cases-export-all-as-a-name")],
		["export all as a string", fixture("javascript", "collect-esm-import-specifiers-cases-export-all-as-a-string")],
		["export named from", fixture("javascript", "collect-esm-import-specifiers-cases-export-named-from")],
		["export string names from", fixture("javascript", "collect-esm-import-specifiers-cases-export-string-names-from")],
		["local export", fixture("javascript", "collect-esm-import-specifiers-cases-local-export")],
		["local string export", fixture("javascript", "collect-esm-import-specifiers-cases-local-string-export")],
		["export declaration", fixture("javascript", "collect-esm-import-specifiers-cases-export-declaration")],
		["export function", fixture("javascript", "collect-esm-import-specifiers-cases-export-function")],
		["dynamic import", fixture("javascript", "collect-esm-import-specifiers-cases-dynamic-import")],
		["awaited dynamic import", fixture("javascript", "collect-esm-import-specifiers-cases-awaited-dynamic-import")],
		["dynamic import with options", fixture("javascript", "collect-esm-import-specifiers-cases-dynamic-import-with-options")],
		["dynamic import with a comment", fixture("javascript", "collect-esm-import-specifiers-cases-dynamic-import-with-a-comment")],
		["dynamic template import", fixture("javascript", "collect-esm-import-specifiers-cases-dynamic-template-import")],
		["escaped dynamic template", fixture("javascript", "collect-esm-import-specifiers-cases-escaped-dynamic-template")],
		["dynamic template with a carriage return", fixture("javascript", "collect-esm-import-specifiers-cases-dynamic-template-with-a-carriage-return")],
		["dynamic template with \\0", fixture("javascript", "collect-esm-import-specifiers-cases-dynamic-template-with-0")],
		["dynamic template with substitution", fixture("javascript", "collect-esm-import-specifiers-cases-dynamic-template-with-substitution")],
		["dynamic import of a name", fixture("javascript", "collect-esm-import-specifiers-cases-dynamic-import-of-a-name")],
		["dynamic import of a sum", fixture("javascript", "collect-esm-import-specifiers-cases-dynamic-import-of-a-sum")],
		["static and dynamic", fixture("javascript", "collect-esm-import-specifiers-cases-static-and-dynamic")],
		["dynamic and static", fixture("javascript", "collect-esm-import-specifiers-cases-dynamic-and-static")],
		["import.meta", fixture("javascript", "collect-esm-import-specifiers-cases-import-meta")],
		["member named import", fixture("javascript", "collect-esm-import-specifiers-cases-member-named-import")],
		["method named import", fixture("javascript", "collect-esm-import-specifiers-cases-method-named-import")],
		["class method named import", fixture("javascript", "collect-esm-import-specifiers-cases-class-method-named-import")],
		["spread of a dynamic import", fixture("javascript", "collect-esm-import-specifiers-cases-spread-of-a-dynamic-import")],
		["keyword in a string", fixture("javascript", "collect-esm-import-specifiers-cases-keyword-in-a-string")],
		["keyword in a line comment", fixture("javascript", "collect-esm-import-specifiers-cases-keyword-in-a-line-comment")],
		["keyword in a block comment", fixture("javascript", "collect-esm-import-specifiers-cases-keyword-in-a-block-comment")],
		["keyword in a template", fixture("javascript", "collect-esm-import-specifiers-cases-keyword-in-a-template")],
		[
			"keyword in a substitution",
			fixture("javascript", "collect-esm-import-specifiers-cases-keyword-in-a-substitution")
		],
		[
			"braces in a substitution",
			fixture("javascript", "collect-esm-import-specifiers-cases-braces-in-a-substitution")
		],
		[
			"nested template",
			fixture("javascript", "collect-esm-import-specifiers-cases-nested-template")
		],
		["keyword in a regexp", fixture("javascript", "collect-esm-import-specifiers-cases-keyword-in-a-regexp")],
		["slash in a regexp class", fixture("javascript", "collect-esm-import-specifiers-cases-slash-in-a-regexp-class")],
		["division", fixture("javascript", "collect-esm-import-specifiers-cases-division")],
		["division after a call", fixture("javascript", "collect-esm-import-specifiers-cases-division-after-a-call")],
		["division after an index", fixture("javascript", "collect-esm-import-specifiers-cases-division-after-an-index")],
		["division after a string", fixture("javascript", "collect-esm-import-specifiers-cases-division-after-a-string")],
		["division after a template", fixture("javascript", "collect-esm-import-specifiers-cases-division-after-a-template")],
		["division after a regexp", fixture("javascript", "collect-esm-import-specifiers-cases-division-after-a-regexp")],
		["division after a postfix", fixture("javascript", "collect-esm-import-specifiers-cases-division-after-a-postfix")],
		["division after a number", fixture("javascript", "collect-esm-import-specifiers-cases-division-after-a-number")],
		[
			"division after a property named like a keyword",
			fixture("javascript", "collect-esm-import-specifiers-cases-division-after-a-keyword-property")
		],
		["regexp after a prefix", fixture("javascript", "collect-esm-import-specifiers-cases-regexp-after-a-prefix")],
		["regexp after return", fixture("javascript", "collect-esm-import-specifiers-cases-regexp-after-return")],
		["regexp after typeof", fixture("javascript", "collect-esm-import-specifiers-cases-regexp-after-typeof")],
		["regexp after an operator", fixture("javascript", "collect-esm-import-specifiers-cases-regexp-after-an-operator")],
		["regexp after a block", fixture("javascript", "collect-esm-import-specifiers-cases-regexp-after-a-block")],
		["regexp after if (…)", fixture("javascript", "collect-esm-import-specifiers-cases-regexp-after-if")],
		["regexp after while (…)", fixture("javascript", "collect-esm-import-specifiers-cases-regexp-after-while")],
		["regexp after a comment", fixture("javascript", "collect-esm-import-specifiers-cases-regexp-after-a-comment")],
		["regexp after two comments", fixture("javascript", "collect-esm-import-specifiers-cases-regexp-after-two-comments")],
		["regexp at the start", fixture("javascript", "collect-esm-import-specifiers-cases-regexp-at-the-start")],
		["regexp with flags", fixture("javascript", "collect-esm-import-specifiers-cases-regexp-with-flags")],
		["hashbang", fixture("javascript", "collect-esm-import-specifiers-cases-hashbang")],
		["byte order mark", fixture("javascript", "collect-esm-import-specifiers-cases-byte-order-mark")],
		["non-ASCII whitespace", fixture("javascript", "collect-esm-import-specifiers-cases-non-ascii-whitespace")],
		["non-ASCII name ending in import", fixture("javascript", "collect-esm-import-specifiers-cases-non-ascii-name-ending-in-import")],
		["non-ASCII name starting with export", fixture("javascript", "collect-esm-import-specifiers-cases-non-ascii-name-starting-with-export")],
		["escapes in the specifier", fixture("javascript", "collect-esm-import-specifiers-cases-escapes-in-the-specifier")],
		["unicode line terminators in code", fixture("javascript", "collect-esm-import-specifiers-cases-unicode-line-terminators-in-code")],
		["default import without spaces", fixture("javascript", "collect-esm-import-specifiers-cases-default-import-without-spaces")],
		["named imports across lines", fixture("javascript", "collect-esm-import-specifiers-cases-named-imports-across-lines")],
		["default and named across lines", fixture("javascript", "collect-esm-import-specifiers-cases-default-and-named-across-lines")],
		["namespace import without spaces", fixture("javascript", "collect-esm-import-specifiers-cases-namespace-import-without-spaces")],
		["named import with a trailing comma", fixture("javascript", "collect-esm-import-specifiers-cases-named-import-with-a-trailing-comma")],
		["empty named import", fixture("javascript", "collect-esm-import-specifiers-cases-empty-named-import")],
		["default and empty named import", fixture("javascript", "collect-esm-import-specifiers-cases-default-and-empty-named-import")],
		["import of a binding named from", fixture("javascript", "collect-esm-import-specifiers-cases-import-of-a-binding-named-from")],
		["import of bindings named as", fixture("javascript", "collect-esm-import-specifiers-cases-import-of-bindings-named-as")],
		["default import named defer", fixture("javascript", "collect-esm-import-specifiers-cases-default-import-named-defer")],
		["default import named source", fixture("javascript", "collect-esm-import-specifiers-cases-default-import-named-source")],
		["comment between the binding and from", fixture("javascript", "collect-esm-import-specifiers-cases-comment-between-the-binding-and-from")],
		["line comment inside the braces", fixture("javascript", "collect-esm-import-specifiers-cases-line-comment-inside-the-braces")],
		["comment before the specifier", fixture("javascript", "collect-esm-import-specifiers-cases-comment-before-the-specifier")],
		["comment after import", fixture("javascript", "collect-esm-import-specifiers-cases-comment-after-import")],
		["comment before a bare specifier", fixture("javascript", "collect-esm-import-specifiers-cases-comment-before-a-bare-specifier")],
		["non-ASCII binding", fixture("javascript", "collect-esm-import-specifiers-cases-non-ascii-binding")],
		["non-ASCII named import", fixture("javascript", "collect-esm-import-specifiers-cases-non-ascii-named-import")],
		["dollar and underscore bindings", fixture("javascript", "collect-esm-import-specifiers-cases-dollar-and-underscore-bindings")],
		["string name holding a brace", fixture("javascript", "collect-esm-import-specifiers-cases-string-name-holding-a-brace")],
		["string name holding from", fixture("javascript", "collect-esm-import-specifiers-cases-string-name-holding-from")],
		["string name holding a quote", fixture("javascript", "collect-esm-import-specifiers-cases-string-name-holding-a-quote")],
		["attributes across lines", fixture("javascript", "collect-esm-import-specifiers-cases-attributes-across-lines")],
		["attributes on a bare import", fixture("javascript", "collect-esm-import-specifiers-cases-attributes-on-a-bare-import")],
		["attributes on an export", fixture("javascript", "collect-esm-import-specifiers-cases-attributes-on-an-export")],
		["two imports on one line", fixture("javascript", "collect-esm-import-specifiers-cases-two-imports-on-one-line")],
		["imports without semicolons", fixture("javascript", "collect-esm-import-specifiers-cases-imports-without-semicolons")],
		["single-quoted specifiers", fixture("javascript", "collect-esm-import-specifiers-cases-single-quoted-specifiers")],
		["repeated specifier in two clauses", fixture("javascript", "collect-esm-import-specifiers-cases-repeated-specifier-in-two-clauses")],
		["specifier with spaces", fixture("javascript", "collect-esm-import-specifiers-cases-specifier-with-spaces")],
		["specifier holding slashes and stars", fixture("javascript", "collect-esm-import-specifiers-cases-specifier-holding-slashes-and-stars")],
		["export all without spaces", fixture("javascript", "collect-esm-import-specifiers-cases-export-all-without-spaces")],
		["export all as across lines", fixture("javascript", "collect-esm-import-specifiers-cases-export-all-as-across-lines")],
		["export list across lines", fixture("javascript", "collect-esm-import-specifiers-cases-export-list-across-lines")],
		["empty export list from", fixture("javascript", "collect-esm-import-specifiers-cases-empty-export-list-from")],
		["re-export of default", fixture("javascript", "collect-esm-import-specifiers-cases-re-export-of-default")],
		["re-export of default under a name", fixture("javascript", "collect-esm-import-specifiers-cases-re-export-of-default-under-a-name")],
		["comment in an export list", fixture("javascript", "collect-esm-import-specifiers-cases-comment-in-an-export-list")],
		["comment after export", fixture("javascript", "collect-esm-import-specifiers-cases-comment-after-export")],
		["export all as a non-ASCII name", fixture("javascript", "collect-esm-import-specifiers-cases-export-all-as-a-non-ascii-name")],
		["local export list then a string", fixture("javascript", "collect-esm-import-specifiers-cases-local-export-list-then-a-string")],
		["export default function holding import()", fixture("javascript", "collect-esm-import-specifiers-cases-export-default-function-holding-import")],
		["export class holding import()", fixture("javascript", "collect-esm-import-specifiers-cases-export-class-holding-import")],
		["export async function holding import()", fixture("javascript", "collect-esm-import-specifiers-cases-export-async-function-holding-import")],
		["export of a binding named from", fixture("javascript", "collect-esm-import-specifiers-cases-export-of-a-binding-named-from")],
		["export default of a string", fixture("javascript", "collect-esm-import-specifiers-cases-export-default-of-a-string")],
		["import() in an arrow", fixture("javascript", "collect-esm-import-specifiers-cases-import-in-an-arrow")],
		["import() in a substitution", fixture("javascript", "collect-esm-import-specifiers-cases-import-in-a-substitution")],
		["import() in a nested substitution", fixture("javascript", "collect-esm-import-specifiers-cases-import-in-a-nested-substitution")],
		["import() after a comment", fixture("javascript", "collect-esm-import-specifiers-cases-import-after-a-comment")],
		["import() with a trailing comma", fixture("javascript", "collect-esm-import-specifiers-cases-import-with-a-trailing-comma")],
		["import() in both branches", fixture("javascript", "collect-esm-import-specifiers-cases-import-in-both-branches")],
		["chained import()", fixture("javascript", "collect-esm-import-specifiers-cases-chained-import")],
		["import() of a parenthesized string", fixture("javascript", "collect-esm-import-specifiers-cases-import-of-a-parenthesized-string")],
		["import() of a parenthesized sum", fixture("javascript", "collect-esm-import-specifiers-cases-import-of-a-parenthesized-sum")],
		["import() of a call", fixture("javascript", "collect-esm-import-specifiers-cases-import-of-a-call")],
		["import.meta.resolve", fixture("javascript", "collect-esm-import-specifiers-cases-import-meta-resolve")],
		["import.meta in a substitution", fixture("javascript", "collect-esm-import-specifiers-cases-import-meta-in-a-substitution")],
		["exports identifier", fixture("javascript", "collect-esm-import-specifiers-cases-exports-identifier")],
		["importScripts call", fixture("javascript", "collect-esm-import-specifiers-cases-a-call-to-import-scripts")],
		["names holding the keywords", fixture("javascript", "collect-esm-import-specifiers-cases-names-holding-the-keywords")],
		["keywords as properties", fixture("javascript", "collect-esm-import-specifiers-cases-keywords-as-properties")],
		["keyword as a method", fixture("javascript", "collect-esm-import-specifiers-cases-keyword-as-a-method")],
		["keyword after an optional chain", fixture("javascript", "collect-esm-import-specifiers-cases-keyword-after-an-optional-chain")],
		["keyword after a dot and a comment", fixture("javascript", "collect-esm-import-specifiers-cases-keyword-after-a-dot-and-a-comment")],
		["keyword after a dot and a newline", fixture("javascript", "collect-esm-import-specifiers-cases-keyword-after-a-dot-and-a-newline")],
		["keyword in a regexp class", fixture("javascript", "collect-esm-import-specifiers-cases-keyword-in-a-regexp-class")],
		["keyword after a regexp", fixture("javascript", "collect-esm-import-specifiers-cases-keyword-after-a-regexp")],
		["keyword in a starred block comment", fixture("javascript", "collect-esm-import-specifiers-cases-keyword-in-a-starred-block-comment")],
		["comment ending at a carriage return", fixture("javascript", "collect-esm-import-specifiers-cases-comment-ending-at-a-carriage-return")],
		["comment ending at a line separator", fixture("javascript", "collect-esm-import-specifiers-cases-comment-ending-at-a-line-separator")],
		["comment ending at a paragraph separator", fixture("javascript", "collect-esm-import-specifiers-cases-comment-ending-at-a-paragraph-separator")],
		["keyword in an escaped string", fixture("javascript", "collect-esm-import-specifiers-cases-keyword-in-an-escaped-string")],
		["keyword in a template with escapes", fixture("javascript", "collect-esm-import-specifiers-cases-keyword-in-a-template-with-escapes")],
		["regexp after for (…)", fixture("javascript", "collect-esm-import-specifiers-cases-regexp-after-for")],
		["division after a method named if", fixture("javascript", "collect-esm-import-specifiers-cases-division-after-a-method-named-if")],
		["division after a name holding a keyword", fixture("javascript", "collect-esm-import-specifiers-cases-division-after-a-name-holding-a-keyword")],
		["regexp after void", fixture("javascript", "collect-esm-import-specifiers-cases-regexp-after-void")],
		["regexp after an arrow", fixture("javascript", "collect-esm-import-specifiers-cases-regexp-after-an-arrow")],
		["regexp after a colon", fixture("javascript", "collect-esm-import-specifiers-cases-regexp-after-a-colon")],
		["regexp after a comma", fixture("javascript", "collect-esm-import-specifiers-cases-regexp-after-a-comma")],
		["regexp after an empty block comment", fixture("javascript", "collect-esm-import-specifiers-cases-regexp-after-an-empty-block-comment")],
		["regexp holding every quote", fixture("javascript", "collect-esm-import-specifiers-cases-regexp-holding-every-quote")],
		["regexp with an escaped slash", fixture("javascript", "collect-esm-import-specifiers-cases-regexp-with-an-escaped-slash")],
		["division after a decrement", fixture("javascript", "collect-esm-import-specifiers-cases-division-after-a-decrement")],
		["regexp in a substitution", fixture("javascript", "collect-esm-import-specifiers-cases-regexp-in-a-substitution")],
		["division in a substitution", fixture("javascript", "collect-esm-import-specifiers-cases-division-in-a-substitution")],
		["dollar not opening a substitution", fixture("javascript", "collect-esm-import-specifiers-cases-dollar-not-opening-a-substitution")],
		["escaped substitution", fixture("javascript", "collect-esm-import-specifiers-cases-escaped-substitution")],
		["object literal in a substitution", fixture("javascript", "collect-esm-import-specifiers-cases-object-literal-in-a-substitution")],
		["function body in a substitution", fixture("javascript", "collect-esm-import-specifiers-cases-function-body-in-a-substitution")],
		["string holding a backtick", fixture("javascript", "collect-esm-import-specifiers-cases-string-holding-a-backtick")],
		["two templates on one line", fixture("javascript", "collect-esm-import-specifiers-cases-two-templates-on-one-line")],
		["tabs in a clause", fixture("javascript", "collect-esm-import-specifiers-cases-tabs-in-a-clause")],
		["vertical tab and form feed", fixture("javascript", "collect-esm-import-specifiers-cases-vertical-tab-and-form-feed")],
		["no-break spaces in a clause", fixture("javascript", "collect-esm-import-specifiers-cases-no-break-spaces-in-a-clause")],
		["no-break space before import()", fixture("javascript", "collect-esm-import-specifiers-cases-no-break-space-before-import")],
		["line separator in a clause", fixture("javascript", "collect-esm-import-specifiers-cases-line-separator-in-a-clause")],
		["byte order mark in a clause", fixture("javascript", "collect-esm-import-specifiers-cases-byte-order-mark-in-a-clause")],
		["CRLF line endings", fixture("javascript", "collect-esm-import-specifiers-cases-crlf-line-endings")],
		["hashbang holding a comment", fixture("javascript", "collect-esm-import-specifiers-cases-hashbang-holding-a-comment")],
		["many constructs in one module", fixture("javascript", "collect-esm-import-specifiers-cases-many-constructs-in-one-module")]
	];

	for (const [name, source] of cases) {
		it(`should match the ast for ${name}`, () => {
			expect([...collectEsmImportSpecifiers(source)]).toEqual([
				...withParser(source)
			]);
		});
	}

	it("should read import phases", () => {
		const source = fixture(
			"javascript",
			"collect-esm-import-specifiers-cases-import-phases"
		);
		expect([...collectEsmImportSpecifiers(source)]).toEqual([
			...withParser(source)
		]);
		expect([...collectEsmImportSpecifiers(source)]).toEqual([
			["./a", false],
			["./b", false],
			["./c", true],
			["./d", true]
		]);
	});

	// The scan reads whatever is on disk, so it must terminate on source the ast
	// reference cannot parse at all.
	describe("malformed source", () => {
		/** @type {[string, string, [string, boolean][]][]} */
		const malformed = [
			["empty source", fixture("javascript", "collect-esm-import-specifiers-malformed-empty-source"), []],
			["import at the end", fixture("javascript", "collect-esm-import-specifiers-malformed-import-at-the-end"), []],
			["export at the end", fixture("javascript", "collect-esm-import-specifiers-malformed-export-at-the-end"), []],
			["unterminated import clause", fixture("javascript", "collect-esm-import-specifiers-malformed-unterminated-import-clause"), []],
			["unterminated export list", fixture("javascript", "collect-esm-import-specifiers-malformed-unterminated-export-list"), []],
			["from at the end", fixture("javascript", "collect-esm-import-specifiers-malformed-from-at-the-end"), []],
			["unterminated dynamic import", fixture("javascript", "collect-esm-import-specifiers-malformed-unterminated-dynamic-import"), []],
			[
				"newline in a dynamic specifier",
				fixture("javascript", "collect-esm-import-specifiers-malformed-newline-in-a-dynamic-specifier"),
				[["./c", false]]
			],
			[
				"newline in an exported name",
				fixture("javascript", "collect-esm-import-specifiers-malformed-newline-in-an-exported-name"),
				[["./d", false]]
			],
			["unterminated import method", fixture("javascript", "collect-esm-import-specifiers-malformed-unterminated-import-method"), []],
			["unterminated dynamic template", fixture("javascript", "collect-esm-import-specifiers-malformed-unterminated-dynamic-template"), []],
			["template with a bad escape", fixture("javascript", "collect-esm-import-specifiers-malformed-template-with-a-bad-escape"), []],
			["template with an octal escape", fixture("javascript", "collect-esm-import-specifiers-malformed-template-with-an-octal-escape"), []],
			["template with \\0 and a digit", fixture("javascript", "collect-esm-import-specifiers-malformed-template-with-0-and-a-digit"), []],
			["template with \\8", fixture("javascript", "collect-esm-import-specifiers-malformed-template-with-8"), []],
			["unterminated string", fixture("javascript", "collect-esm-import-specifiers-malformed-unterminated-string"), [["./a", false]]],
			["newline in a string", fixture("javascript", "collect-esm-import-specifiers-malformed-newline-in-a-string"), [["./a", false]]],
			["unterminated line comment", fixture("javascript", "collect-esm-import-specifiers-malformed-unterminated-line-comment"), [["./a", false]]],
			["unterminated block comment", fixture("javascript", "collect-esm-import-specifiers-malformed-unterminated-block-comment"), [["./a", false]]],
			["unterminated template", fixture("javascript", "collect-esm-import-specifiers-malformed-unterminated-template"), [["./a", false]]],
			[
				"unterminated substitution",
				fixture("javascript", "collect-esm-import-specifiers-malformed-unterminated-substitution"),
				[["./a", false]]
			],
			["unterminated regexp", fixture("javascript", "collect-esm-import-specifiers-malformed-unterminated-regexp"), [["./a", false]]],
			["unbalanced paren before a slash", fixture("javascript", "collect-esm-import-specifiers-malformed-unbalanced-paren-before-a-slash"), [["./a", false]]],
			["unterminated hashbang", fixture("javascript", "collect-esm-import-specifiers-malformed-unterminated-hashbang"), []],
			["bad escape in the specifier", fixture("javascript", "collect-esm-import-specifiers-malformed-bad-escape-in-the-specifier"), [["./b", false]]],
			["newline in the specifier", fixture("javascript", "collect-esm-import-specifiers-malformed-newline-in-the-specifier"), [["./c", false]]],
			["unterminated block comment hiding an import", fixture("javascript", "collect-esm-import-specifiers-malformed-unterminated-block-comment-hiding-an"), []],
			["unterminated template hiding an import", fixture("javascript", "collect-esm-import-specifiers-malformed-unterminated-template-hiding-an-import"), []],
			["import brace at the end", fixture("javascript", "collect-esm-import-specifiers-malformed-import-brace-at-the-end"), []],
			["export all without from", fixture("javascript", "collect-esm-import-specifiers-malformed-export-all-without-from"), [["./a",false]]],
			["export list without a specifier", fixture("javascript", "collect-esm-import-specifiers-malformed-export-list-without-a-specifier"), [["./a",false]]],
			["dynamic import of an unterminated string", fixture("javascript", "collect-esm-import-specifiers-malformed-dynamic-import-of-an-unterminated-string"), []],
			["regexp at the end", fixture("javascript", "collect-esm-import-specifiers-malformed-regexp-at-the-end"), []],
			["lone backslash", fixture("javascript", "collect-esm-import-specifiers-malformed-lone-backslash"), []],
			["comment ending at a lone carriage return", fixture("javascript", "collect-esm-import-specifiers-malformed-comment-ending-at-a-lone-carriage-return"), []],
			["slash at the end", fixture("javascript", "collect-esm-import-specifiers-malformed-slash-at-the-end"), []],
			["unterminated string holding an import", fixture("javascript", "collect-esm-import-specifiers-malformed-unterminated-string-holding-an-import"), []]
		];

		for (const [name, source, expected] of malformed) {
			it(`should terminate on ${name}`, () => {
				expect([...collectEsmImportSpecifiers(source)]).toEqual(expected);
			});
		}
	});

	// es-module-lexer's own test sources, read from its test files. Those the
	// parser reads are held to its tree; the others to reviewed results, which
	// match the lexer's but where a parenthesized specifier counts, as it does.
	describe("es-module-lexer's test sources", () => {
		const parsed = [
		["Lexer > Import attributes parsing", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-import-attributes-parsing")],
		["Lexer > Import attributes stay attached across non-static records", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-import-attributes-stay")],
		["Lexer > Import attributes with quoted keys and escape sequences", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-import-attributes-with")],
		["Lexer > keyword case again", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-keyword-case-again")],
		["Lexer > Regex case", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-regex-case")],
		["Lexer > keyword case", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-keyword-case")],
		["Lexer > Dynamic import expression range 2", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-expression-2")],
		["Lexer > Dynamic import expression range 3", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-expression-3")],
		["Lexer > Dynamic import expression range 4", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-expression-4")],
		["Lexer > Dynamic import expression range 5", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-expression-5")],
		["Lexer > Dynamic import expression range 6", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-expression-6")],
		["Lexer > Dynamic import expression range 7", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-expression-7")],
		["Lexer > Dynamic import expression range 8", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-expression-8")],
		["Lexer > Dynamic import expression range 9", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-expression-9")],
		["Lexer > Dynamic import expression range 10", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-expression-10")],
		["Lexer > Dynamic import expression range 11", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-expression-11")],
		["Lexer > Dynamic import expression range 12", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-expression-12")],
		["Lexer > Dynamic import expression range 13", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-expression-13")],
		["Lexer > Dynamic import expression range 14", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-expression-14")],
		["Lexer > Dynamic import expression range 15", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-expression-15")],
		["Lexer > Dynamic import expression range 16", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-expression-16")],
		["Lexer > Dynamic import expression range 17", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-expression-17")],
		["Lexer > Dynamic import no-substitution template specifier", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-no")],
		["Lexer > Dynamic import no-substitution template specifier 2", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-no-2")],
		["Lexer > Dynamic import no-substitution template specifier 3", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-no-3")],
		["Lexer > Dynamic import interpolated template specifier glob", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated")],
		["Lexer > Dynamic import interpolated template specifier glob 2", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-2")],
		["Lexer > Dynamic import interpolated template specifier glob 3", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-3")],
		["Lexer > Dynamic import interpolated template specifier glob 4", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-4")],
		["Lexer > Dynamic import interpolated template specifier glob 5", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-5")],
		["Lexer > Dynamic import interpolated template specifier glob 6", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-6")],
		["Lexer > Dynamic import interpolated template specifier glob 7", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-7")],
		["Lexer > Dynamic import interpolated template specifier glob 8", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-8")],
		["Lexer > Dynamic import interpolated template specifier glob 9", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-9")],
		["Lexer > Dynamic import interpolated template specifier glob 10", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-10")],
		["Lexer > Dynamic import interpolated template specifier glob 11", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-11")],
		["Lexer > Dynamic import interpolated template specifier glob 12", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-12")],
		["Lexer > Dynamic import interpolated template specifier glob 13", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-13")],
		["Lexer > Dynamic import interpolated template specifier glob 14", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-14")],
		["Lexer > Dynamic import interpolated template specifier glob 15", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-15")],
		["Lexer > Dynamic import interpolated template specifier glob 16", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-16")],
		["Lexer > Dynamic import interpolated template specifier glob 17", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-17")],
		["Lexer > Dynamic import interpolated template specifier glob 18", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-18")],
		["Lexer > Dynamic import interpolated template specifier glob 19", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-19")],
		["Lexer > Dynamic import interpolated template glob edge cases", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-20")],
		["Lexer > Dynamic import interpolated template glob edge cases 2", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-21")],
		["Lexer > Dynamic import interpolated template glob edge cases 3", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-22")],
		["Lexer > Dynamic import interpolated template glob edge cases 4", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-23")],
		["Lexer > Dynamic import interpolated template glob edge cases 5", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-24")],
		["Lexer > Dynamic import interpolated template glob edge cases 6", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-25")],
		["Lexer > Dynamic import interpolated template glob edge cases 7", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-26")],
		["Lexer > Dynamic import interpolated template glob edge cases 8", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-27")],
		["Lexer > Dynamic import interpolated template glob edge cases 9", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-28")],
		["Lexer > Dynamic import interpolated template glob edge cases 10", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-29")],
		["Lexer > Dynamic import interpolated template glob edge cases 11", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-30")],
		["Lexer > Dynamic import interpolated template glob edge cases 12", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-31")],
		["Lexer > Dynamic import interpolated template glob edge cases 13", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-32")],
		["Lexer > Dynamic import interpolated template glob edge cases 14", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-interpolated-33")],
		["Lexer > Dynamic import template specifier with escapes and attributes", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-template")],
		["Lexer > Dynamic import template specifier with escapes and attributes 2", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-template-2")],
		["Lexer > Dynamic import template specifier with escapes and attributes 3", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-template-3")],
		["Lexer > Dynamic import multi-line no-substitution template specifier", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-multi-line-no")],
		["Lexer > Export declaration multiple declarators", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-declaration-multiple")],
		["Lexer > Export destructuring aliases, defaults, nesting and rest", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-destructuring-aliases")],
		["Lexer > Export declaration stops at ASI without reading next statement", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-declaration-stops-at")],
		["Lexer > Export initializer disambiguates regex, division and comments", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-initializer")],
		["Lexer > Export initializer treats non-ASCII identifiers as values", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-initializer-treats")],
		["Lexer > Export initializer skips nested templates and arrow bodies", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-initializer-skips")],
		["Lexer > Export destructuring computed keys, holes and nested rest", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-destructuring")],
		["Lexer > Export initializer: '/' after a value keyword is a regex", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-initializer-after-a")],
		["Lexer > Export initializer: regex in statement position inside a nested body", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-initializer-regex-in")],
		["Lexer > Export initializer: dynamic import is detected", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-initializer-dynamic")],
		["Lexer > Export destructuring numeric and BigInt property keys", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-destructuring-numeric")],
		["Lexer > import.meta spread", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-import-meta-spread")],
		["Lexer > Template string default bracket", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-template-string-default")],
		["Lexer > Template string default", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-template-string-default-2")],
		["Lexer > Class fn ASI", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-class-fn-asi")],
		["Lexer > Division const after class parse case", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-division-const-after-class")],
		["Lexer > Multiline dynamic import on windows", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-multiline-dynamic-import-on")],
		["Lexer > Basic nested dynamic import support", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-basic-nested-dynamic-import")],
		["Lexer > Import attributes", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-import-attributes")],
		["Lexer > Import meta inside dynamic import", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-import-meta-inside-dynamic")],
		["Lexer > Export", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export")],
		["Lexer > String encoding", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-string-encoding")],
		["Lexer > Regexp case", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-regexp-case")],
		["Lexer > Regexp keyword prefixes", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-regexp-keyword-prefixes")],
		["Lexer > Program-leading block keeps the following regex opaque", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-program-leading-block-keeps")],
		["Lexer > Regexp division", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-regexp-division")],
		["Lexer > Multiline string escapes", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-multiline-string-escapes")],
		["Lexer > Dotted number", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dotted-number")],
		["Lexer > Identifier runs preserve template and punctuation boundaries", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-identifier-runs-preserve")],
		["Lexer > Division operator case", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-division-operator-case")],
		["Lexer > Single parse cases 2", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-single-parse-cases-2")],
		["Lexer > Single parse cases 3", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-single-parse-cases-3")],
		["Lexer > Single parse cases 4", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-single-parse-cases-4")],
		["Lexer > Single parse cases 5", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-single-parse-cases-5")],
		["Lexer > Single parse cases 6", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-single-parse-cases-6")],
		["Lexer > Simple export with unicode conversions", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-simple-export-with-unicode")],
		["Lexer > Simple import", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-simple-import")],
		["Lexer > Empty single quote string import", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-empty-single-quote-string")],
		["Lexer > Empty double quote string import", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-empty-double-quote-string")],
		["Lexer > Exported function and class", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-exported-function-and-class")],
		["Lexer > Minified import syntax", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-minified-import-syntax")],
		["Lexer > More minified imports", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-more-minified-imports")],
		["Lexer > plus plus division", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-plus-plus-division")],
		["Lexer > return bracket division", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-return-bracket-division")],
		["Lexer > Simple reexport", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-simple-reexport")],
		["Lexer > import.meta", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-import-meta")],
		["Lexer > import meta edge cases", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-import-meta-edge-cases")],
		["Lexer > dynamic import method", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-method")],
		["Lexer > dynamic import edge cases", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-edge-cases")],
		["Lexer > import after code", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-import-after-code")],
		["Lexer > Empty export", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-empty-export")],
		["Lexer > Export * as", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-as")],
		["Lexer > Export analysis preserves facade traversal after finalization", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-analysis-preserves")],
		["Lexer > Export analysis ignores an export clause inside a comment", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-analysis-ignores-an")],
		["Lexer > Export analysis resolves clauses far past the largest table step", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-analysis-resolves")],
		["Lexer > Export star reexport is module syntax", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-star-reexport-is")],
		["Lexer > A failed parse leaves no state behind 2", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-a-failed-parse-leaves-no-2")],
		["Lexer > Block comment carrying a line break ends a no-line-break scan", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-block-comment-carrying-a")],
		["Lexer > Block comment carrying a line break ends a no-line-break scan 2", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-block-comment-carrying-a-2")],
		["Lexer > Import From > non-identifier-string as (doubleQuote)", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-import-from-non-identifier")],
		["Lexer > Import From > non-identifier-string as (singleQuote)", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-import-from-non-identifier-2")],
		["Lexer > Import From > with-emoji as", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-import-from-with-emoji-as")],
		["Lexer > Export From > Identifier only", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-from-identifier-only")],
		["Lexer > Export From > non-identifier-string as variable (doubleQuote)", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-from-non-identifier")],
		["Lexer > Export From > non-identifier-string as variable (singleQuote)", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-from-non-identifier-2")],
		["Lexer > Export From > with-emoji as", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-from-with-emoji-as")],
		["Lexer > Export From > non-identifier-string (doubleQuote)", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-from-non-identifier-3")],
		["Lexer > Export From > non-identifier-string (singleQuote)", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-from-non-identifier-4")],
		["Lexer > Export From > variable as non-identifier-string (doubleQuote)", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-from-variable-as-non")],
		["Lexer > Export From > variable as non-identifier-string (singleQuote)", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-from-variable-as-non-2")],
		["Lexer > Export From > non-identifier-string as non-identifier-string (doubleQuote)", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-from-non-identifier-5")],
		["Lexer > Export From > non-identifier-string as non-identifier-string (singleQuote)", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-from-non-identifier-6")],
		["Lexer > Export From > complex & edge cases", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-from-complex-edge")],
		["Lexer > Facade", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-facade")],
		["Lexer > Facade default", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-facade-default")],
		["Lexer > Facade declaration1", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-facade-declaration1")],
		["Lexer > Facade declaration2", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-facade-declaration2")],
		["Lexer > Facade declaration4", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-facade-declaration4")],
		["Lexer > Facade side effect", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-facade-side-effect")],
		["Lexer > hasModuleSyntax import1", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-has-module-syntax-import1")],
		["Lexer > hasModuleSyntax import2", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-has-module-syntax-import2")],
		["Lexer > hasModuleSyntax import3", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-has-module-syntax-import3")],
		["Lexer > hasModuleSyntax import4", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-has-module-syntax-import4")],
		["Lexer > hasModuleSyntax export1", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-has-module-syntax-export1")],
		["Lexer > hasModuleSyntax export2", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-has-module-syntax-export2")],
		["Lexer > hasModuleSyntax export3", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-has-module-syntax-export3")],
		["Invalid syntax > parse initializes synchronously when init is not awaited", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-invalid-syntax-parse-initializes")],
		["Invalid syntax > Source views survive buffer growth", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-invalid-syntax-source-views")],
		["Invalid syntax > Embedded null characters do not terminate scanning", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-invalid-syntax-embedded-null")],
		["Full build API > static import", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-full-build-api-static-import")],
		["Full build API > static import with attributes", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-full-build-api-static-import-with")],
		["Full build API > empty attribute clauses retain offsets without attribute pairs", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-full-build-api-empty-attribute")],
		["Full build API > dynamic import", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-full-build-api-dynamic-import")],
		["Full build API > dynamic import template glob", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-full-build-api-dynamic-import-2")],
		["Full build API > import.meta", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-full-build-api-import-meta")],
		["Full build API > direct exports", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-full-build-api-direct-exports")],
		["Full build API > reexports", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-full-build-api-reexports")],
		["Full build API > detached reexport of an import binding", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-full-build-api-detached-reexport")],
			["Lexer > Defer phase imports", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-defer-phase-imports")],
			["Full build API > phase imports", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-full-build-api-phase-imports")]
		];

		for (const [name, source] of parsed) {
			it(`should match the ast for ${name}`, () => {
				expect([...collectEsmImportSpecifiers(source)]).toEqual([
					...withParser(source)
				]);
			});
		}

		/** @type {[string, string, [string, boolean][]][]} */
		const reviewed = [
		["Lexer > import types", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-import-types"), [["a",true],["b",false],["c",false],["z",false]]],
		["Lexer > Source phase imports", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-source-phase-imports"), [["specifier",false],["./x.js",false],["x",false],["blah",true]]],
		["Lexer > Dynamic import expression range", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-dynamic-import-expression"), [["asdf",true]]],
		["Lexer > Simple export destructuring", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-simple-export-destructuring"), []],
		["Lexer > Export declaration does not read past a truncated binding list", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-declaration-does-not"), []],
		["Lexer > Export declaration does not read past a truncated binding list 2", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-declaration-does-not-2"), []],
		["Lexer > Export declaration does not read past a truncated binding list 3", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-declaration-does-not-3"), []],
		["Lexer > Export default cases", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-default-cases"), []],
		["Lexer > Invalid string escapes throw", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-invalid-string-escapes-throw"), []],
		["Lexer > Invalid string escapes throw 2", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-invalid-string-escapes-throw-2"), []],
		["Lexer > Invalid string escapes throw 3", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-invalid-string-escapes-throw-3"), [["b",false]]],
		["Lexer > Invalid string escapes throw 4", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-invalid-string-escapes-throw-4"), [["./\u0001.js",false]]],
		["Lexer > Invalid string escapes throw 5", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-invalid-string-escapes-throw-5"), []],
		["Lexer > Invalid string escapes throw 6", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-invalid-string-escapes-throw-6"), []],
		["Lexer > Invalid string escapes throw 7", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-invalid-string-escapes-throw-7"), [["a",false]]],
		["Lexer > Regexp default export", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-regexp-default-export"), []],
		["Lexer > Single parse cases", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-single-parse-cases"), []],
		["Lexer > Import/Export with comments", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-import-export-with-comments"), [["a",false],["b",false]]],
		["Lexer > Export destructuring", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-destructuring-2"), []],
		["Lexer > Comments", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-comments"), [["util",false]]],
		["Lexer > Strings", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-strings"), []],
		["Lexer > Bracket matching", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-bracket-matching"), []],
		["Lexer > Division / Regex ambiguity", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-division-regex-ambiguity"), []],
		["Lexer > Template string expression ambiguity", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-template-string-expression"), [["a",false],["$",true]]],
		["Lexer > many exports", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-many-exports"), []],
		["Lexer > Import binding renamed with no space after as", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-import-binding-renamed-with"), [["./x",false]]],
		["Lexer > Import From > double-quotes-and-curly-bracket", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-import-from-double-quotes"), [["mod0",false]]],
		["Lexer > Import From > single-quotes-and-curly-bracket", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-import-from-single-quotes"), [["mod0",false]]],
		["Lexer > Export From > curly-brace (doubleQuote)", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-from-curly-brace"), [["./mod0.js",false],["./mod1.js",false],["./mod2.js",false]]],
		["Lexer > Export From > * as curly-brace (doubleQuote)", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-from-as-curly-brace"), [["./mod0.js",false],["./mod1.js",false],["./mod2.js",false]]],
		["Lexer > Export From > curly-brace as curly-brace (doubleQuote)", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-from-curly-brace-as"), [["./mod0.js",false],["./mod1.js",false],["./mod2.js",false]]],
		["Lexer > Facade declaration3", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-facade-declaration3"), []],
		["Lexer > Export default", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-export-default"), []],
		["Full build API > type-only records", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-full-build-api-type-only-records"), [["./t.js",false]]],
		];

		for (const [name, source, expected] of reviewed) {
			it(`should read ${name}`, () => {
				expect([...collectEsmImportSpecifiers(source)]).toEqual(expected);
			});
		}

		/** @type {[string, string, [string, boolean][]][]} */
		const invalid = [
		["Lexer > A failed parse leaves no state behind", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-lexer-a-failed-parse-leaves-no"), []],
		["Invalid syntax > Unterminated object", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-invalid-syntax-unterminated-object"), []],
		["Invalid syntax > Invalid string", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-invalid-syntax-invalid-string"), [["./export.js",false],["./reexport1.js",false],["./reexport2.js",false]]],
		["Invalid syntax > Invalid export", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-invalid-syntax-invalid-export"), []],
		["Invalid syntax > Sourcename on the pre-init path", fixture("javascript", "collect-esm-import-specifiers-es-module-lexer-invalid-syntax-sourcename-on-the"), []],
		];

		for (const [name, source, expected] of invalid) {
			it(`should terminate on ${name}`, () => {
				expect([...collectEsmImportSpecifiers(source)]).toEqual(expected);
			});
		}
	});

	it("should read the parser fixtures the same way as the ast", () => {
		const dir = path.resolve(__dirname, "../fixtures/javascript");
		let read = 0;
		let withImports = 0;
		for (const name of fs.readdirSync(dir)) {
			const file = path.join(dir, name, "index.js");
			if (!fs.existsSync(file)) continue;
			const source = fs.readFileSync(file, "utf8");
			/** @type {Map<string, boolean>} */
			let expected;
			try {
				expected = withParser(source);
			} catch (_error) {
				// a script or a syntax error: the scan still has to terminate
				collectEsmImportSpecifiers(source);
				continue;
			}
			read++;
			if (expected.size > 0) withImports++;
			expect([name, [...collectEsmImportSpecifiers(source)]]).toEqual([
				name,
				[...expected]
			]);
		}
		expect(read).toBeGreaterThan(1000);
		expect(withImports).toBeGreaterThan(50);
	});
});
