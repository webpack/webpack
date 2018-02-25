"use strict";

const CaseSensitiveModulesWarning = require("../lib/CaseSensitiveModulesWarning");

const createModule = function(identifier, numberOfReasons) {
	const reasons = new Array(numberOfReasons || 0)
		.fill(null)
		.map((value, index) => {
			return {
				module: createModule(`${identifier}-reason-${index}`)
			};
		});

	return {
		identifier: () => identifier,
		reasons
	};
};

describe("CaseSensitiveModulesWarning", () => {
	let myCaseSensitiveModulesWarning;
	let modules;

	beforeEach(() => {
		modules = [
			createModule("FOOBAR"),
			createModule("FooBar", 1),
			createModule("foobar", 2)
		];
		myCaseSensitiveModulesWarning = new CaseSensitiveModulesWarning(modules);
	});

	it("has the a name", () => {
		expect(myCaseSensitiveModulesWarning.name).toBe(
			"CaseSensitiveModulesWarning"
		);
	});

	it("has the a message", () => {
		expect(myCaseSensitiveModulesWarning.message).toBe(
			`
There are multiple modules with names that only differ in casing.
This can lead to unexpected behavior when compiling on a filesystem with other case-semantic.
Use equal casing. Compare these module identifiers:
* FOOBAR
* FooBar
    Used by 1 module(s), i. e.
    FooBar-reason-0
* foobar
    Used by 2 module(s), i. e.
    foobar-reason-0
`.trim()
		);
	});

	it("has the an origin", () => {
		expect(myCaseSensitiveModulesWarning.origin).toBe(modules[0]);
	});

	it("has the a module", () => {
		expect(myCaseSensitiveModulesWarning.module).toBe(modules[0]);
	});
});
