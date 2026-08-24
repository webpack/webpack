/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const JavascriptParser = require("../lib/javascript/JavascriptParser");
const analyzeScope = require("../lib/javascript/ScopeAnalyzer");
const { getAllReferences } = require("../lib/util/concatenate");

/** @typedef {import("../lib/javascript/ScopeAnalyzer").Scope} Scope */
/** @typedef {import("../lib/javascript/ScopeAnalyzer").Variable} Variable */

/**
 * @param {string} code source code
 * @returns {Scope} the module scope, with references collected at every depth
 */
const moduleScopeOf = (code) =>
	analyzeScope(
		JavascriptParser._parse(code, { sourceType: "module" }).ast,
		true
	).moduleScope;

/**
 * @param {Scope} scope a scope
 * @param {string} name a declared name
 * @returns {Variable} the binding
 */
const binding = (scope, name) =>
	/** @type {Variable} */
	(scope.variables.find((variable) => variable.name === name));

/**
 * @param {import("../lib/javascript/ScopeAnalyzer").Reference[]} references references
 * @returns {string[]} one entry per reference, in order
 */
const at = (references) =>
	references.map(
		(reference) =>
			`${reference.identifier.name}@${/** @type {EXPECTED_ANY} */ (reference.identifier).start}`
	);

describe("getAllReferences", () => {
	it("includes the references of a name its own scope binds twice", () => {
		// the class name binds outside and inside, and renaming moves both
		const moduleScope = moduleScopeOf(
			"class C { m() { return C; } }\nC;\nnew C();"
		);
		const outer = binding(moduleScope, "C");

		expect(at(outer.references).length).toBeLessThan(
			at(getAllReferences(outer)).length
		);
		// every occurrence has to be renamed, inner ones included; the inner
		// reference is appended after the binding's own, which the order pins
		expect(at(getAllReferences(outer))).toEqual(["C@30", "C@37", "C@23"]);
	});

	it("returns the same references when the index is already built", () => {
		const moduleScope = moduleScopeOf(
			"class C { m() { return C; } }\nC;\nclass D { n() { return D; } }\nD;"
		);
		const first = at(getAllReferences(binding(moduleScope, "C")));
		const second = at(getAllReferences(binding(moduleScope, "C")));
		const other = at(getAllReferences(binding(moduleScope, "D")));

		// the second call is served from the cache built by the first
		expect(second).toEqual(first);
		expect(other).not.toEqual([]);
		expect(at(getAllReferences(binding(moduleScope, "D")))).toEqual(other);
	});

	it("hands back the binding's own list when nothing is bound twice", () => {
		const moduleScope = moduleScopeOf("let a = 1;\na;\na;");
		const a = binding(moduleScope, "a");

		// no copy is made when no inner binding contributes
		expect(getAllReferences(a)).toBe(a.references);
	});
});
