/* globals describe, it, beforeEach */
"use strict";

const ExternalModule = require("../lib/ExternalModule");
const OriginalSource = require("webpack-sources").OriginalSource;
const RawSource = require("webpack-sources").RawSource;

describe("ExternalModule", () => {
	let externalModule;
	let request;
	let type;
	beforeEach(() => {
		request = "some/request";
		type = "some-type";
		externalModule = new ExternalModule(request, type, `${type} ${request}`);
	});
	describe("#identifier", () => {
		it("returns an identifier for this module", () => {
			const expected = `external "${request}"`;
			expect(externalModule.identifier()).toBe(expected);
		});
	});

	describe("#readableIdentifier", () => {
		it("returns an identifier for this module", () => {
			const expected = `external "${request}"`;
			expect(externalModule.identifier()).toBe(expected);
		});
	});

	describe("#needRebuild", () => {
		it("always returns false", () => {
			expect(externalModule.needRebuild()).toBe(false);
		});
	});

	describe("#size", () => {
		it("always returns 42", () => {
			expect(externalModule.size()).toBe(42);
		});
	});

	describe("#source", () => {
		it("calls getSource with the result of getSourceString", () => {
			// set up
			const expectedString = "something expected stringy";
			const expectedSource = "something expected source";
			externalModule.getSource = jest.fn(() => expectedSource);
			externalModule.getSourceString = jest.fn(() => expectedString);

			// invoke
			const result = externalModule.source();

			// check
			expect(externalModule.getSource.mock.calls.length).toBe(1);
			expect(externalModule.getSourceString.mock.calls.length).toBe(1);
			expect(externalModule.getSource.mock.calls[0][0]).toBe(expectedString);
			expect(result).toEqual(expectedSource);
		});
	});

	describe("#getSource", () => {
		describe("given it should use source maps", () => {
			beforeEach(() => {
				externalModule.useSourceMap = true;
			});
			it("returns an instance of OriginalSource", () => {
				// set up
				const someSourceString = "some source string";

				// invoke
				const result = externalModule.getSource(someSourceString);

				// check
				expect(result).toBeInstanceOf(OriginalSource);
			});
		});
		describe("given it does not use source maps", () => {
			beforeEach(() => {
				externalModule.useSourceMap = false;
			});
			it("returns an instance of RawSource", () => {
				// set up
				const someSourceString = "some source string";

				// invoke
				const result = externalModule.getSource(someSourceString);

				// check
				expect(result).toBeInstanceOf(RawSource);
			});
		});
	});

	describe("#getSourceForGlobalVariableExternal", () => {
		describe("given an array as variable name in the global namespace", () => {
			it("use the array as lookup in the global object", () => {
				// set up
				const type = "window";
				const varName = ["foo", "bar"];
				const expected =
					'(function() { module.exports = window["foo"]["bar"]; }());';

				// invoke
				const result = externalModule.getSourceForGlobalVariableExternal(
					varName,
					type
				);

				// check
				expect(result).toEqual(expected);
			});
		});
		describe("given an single variable name", () => {
			it("look it up in the global namespace", () => {
				// set up
				const type = "window";
				const varName = "foo";
				const expected = '(function() { module.exports = window["foo"]; }());';

				// invoke
				const result = externalModule.getSourceForGlobalVariableExternal(
					varName,
					type
				);

				// check
				expect(result).toEqual(expected);
			});
		});
	});

	describe("#getSourceForCommonJsExternal", () => {
		describe("given an array as names in the global namespace", () => {
			it("use the first to require a module and the rest as lookup on the required module", () => {
				// set up
				const varName = ["module", "look", "up"];
				const expected = 'module.exports = require(module)["look"]["up"];';

				// invoke
				const result = externalModule.getSourceForCommonJsExternal(
					varName,
					type
				);

				// check
				expect(result).toEqual(expected);
			});
		});
		describe("given an single variable name", () => {
			it("require a module with that name", () => {
				// set up
				const type = "window";
				const varName = "foo";
				const expected = 'module.exports = require("foo");';

				// invoke
				const result = externalModule.getSourceForCommonJsExternal(
					varName,
					type
				);

				// check
				expect(result).toEqual(expected);
			});
		});
	});

	describe("#checkExternalVariable", () => {
		it("creates a check that fails if a variable does not exist", () => {
			// set up
			const variableToCheck = "foo";
			const request = "bar";
			const expected = `if(typeof foo === 'undefined') {var e = new Error("Cannot find module 'bar'"); e.code = 'MODULE_NOT_FOUND'; throw e;}
`;

			// invoke
			const result = externalModule.checkExternalVariable(
				variableToCheck,
				request
			);

			// check
			expect(result).toEqual(expected);
		});
	});

	describe("#getSourceForAmdOrUmdExternal", () => {
		it("looks up a global variable as specified by the id", () => {
			// set up
			const id = "someId";
			const optional = false;
			const expected = "module.exports = __WEBPACK_EXTERNAL_MODULE_someId__;";

			// invoke
			const result = externalModule.getSourceForAmdOrUmdExternal(
				id,
				optional,
				request
			);

			// check
			expect(result).toEqual(expected);
		});
		describe("given an optional check is set", function() {
			it("ads a check for the existence of the variable before looking it up", () => {
				// set up
				const id = "someId";
				const optional = true;
				const expected = `if(typeof __WEBPACK_EXTERNAL_MODULE_someId__ === 'undefined') {var e = new Error("Cannot find module 'some/request'"); e.code = 'MODULE_NOT_FOUND'; throw e;}
module.exports = __WEBPACK_EXTERNAL_MODULE_someId__;`;

				// invoke
				const result = externalModule.getSourceForAmdOrUmdExternal(
					id,
					optional,
					request
				);

				// check
				expect(result).toEqual(expected);
			});
		});
	});

	describe("#getSourceForDefaultCase", () => {
		it("returns the given request as lookup", () => {
			// set up
			const optional = false;
			const expected = "module.exports = some/request;";

			// invoke
			const result = externalModule.getSourceForDefaultCase(optional, request);

			// check
			expect(result).toEqual(expected);
		});
		describe("given an optional check is requested", function() {
			it("checks for the existence of the request setting it", () => {
				// set up
				const optional = true;
				const expected = `if(typeof some/request === 'undefined') {var e = new Error("Cannot find module 'some/request'"); e.code = 'MODULE_NOT_FOUND'; throw e;}
module.exports = some/request;`;

				// invoke
				const result = externalModule.getSourceForDefaultCase(
					optional,
					request
				);

				// check
				expect(result).toEqual(expected);
			});
		});
	});

	describe("#updateHash", () => {
		let hashedText;
		let hash;
		beforeEach(() => {
			hashedText = "";
			hash = {
				update: text => {
					hashedText += text;
				}
			};
			externalModule.id = 12345678;
			externalModule.updateHash(hash);
		});
		it("updates hash with request", () => {
			expect(hashedText).toMatch("some/request");
		});
		it("updates hash with type", () => {
			expect(hashedText).toMatch("some-type");
		});
		it("updates hash with module id", () => {
			expect(hashedText).toMatch("12345678");
		});
	});

	describe("#updateHash without optional", () => {
		let hashedText;
		let hash;
		beforeEach(() => {
			hashedText = "";
			hash = {
				update: text => {
					hashedText += text;
				}
			};
			// Note no set of `externalModule.optional`, which crashed externals in 3.7.0
			externalModule.id = 12345678;
			externalModule.updateHash(hash);
		});
		it("updates hash with request", () => {
			expect(hashedText).toMatch("some/request");
		});
		it("updates hash with type", () => {
			expect(hashedText).toMatch("some-type");
		});
		it("updates hash with optional flag", () => {
			expect(hashedText).toMatch("false");
		});
		it("updates hash with module id", () => {
			expect(hashedText).toMatch("12345678");
		});
	});
});
