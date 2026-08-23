"use strict";

const { compareRules } = require("./helpers/syntaxEquivalence");

/**
 * @param {string} text a rule's `selector { … }`
 * @returns {import("./helpers/syntaxEquivalence").Rule} the rule, unconditioned
 */
const rule = (text) => ({ chain: [], text });

describe("syntaxEquivalence — what the oracle accepts", () => {
	// The oracle has to accept dropping a dead duplicate and nothing looser:
	// keeping the earlier copy instead would reorder the cascade.
	const before = [
		rule(".a{color:red}"),
		rule(".b{color:blue}"),
		rule(".a{color:red}")
	];
	const signatures = new Map();

	it("accepts the earlier of two identical rules being dropped", () => {
		const after = [rule(".b{color:blue}"), rule(".a{color:red}")];
		expect(compareRules(before, after, signatures)).toBe("");
	});

	it("rejects the later one being dropped instead", () => {
		const after = [rule(".a{color:red}"), rule(".b{color:blue}")];
		expect(compareRules(before, after, signatures)).not.toBe("");
	});

	it("rejects dropping both, a changed value, and an added rule", () => {
		expect(compareRules(before, [rule(".b{color:blue}")], signatures)).not.toBe(
			""
		);
		expect(
			compareRules(
				before,
				[rule(".b{color:blue}"), rule(".a{color:green}")],
				signatures
			)
		).not.toBe("");
		expect(
			compareRules(before, [...before, rule(".c{color:teal}")], signatures)
		).not.toBe("");
	});

	it("accepts a stylesheet unchanged", () => {
		expect(compareRules(before, before, signatures)).toBe("");
	});

	// Three copies collapse to the last as one does, so a sheet repeating a rule
	// many times is not a special case.
	it("accepts every earlier copy of a repeated rule being dropped", () => {
		const many = [
			rule(".a{color:red}"),
			rule(".b{color:blue}"),
			rule(".a{color:red}"),
			rule(".c{color:teal}"),
			rule(".a{color:red}")
		];
		const after = [
			rule(".b{color:blue}"),
			rule(".c{color:teal}"),
			rule(".a{color:red}")
		];
		expect(compareRules(many, after, signatures)).toBe("");
	});
});
