/* globals describe, it, beforeEach */
"use strict";
const sinon = require("sinon");
const ExternalModule = require("../lib/ExternalModule");
const OriginalSource = require("webpack-sources").OriginalSource;
const RawSource = require("webpack-sources").RawSource;

describe("ExternalModule", function() {
	let externalModule;
	let request;
	let type;
	beforeEach(function() {
		request = "some/request";
		type = "some-type";
		externalModule = new ExternalModule(
			request,
			type
		);
	});
	describe("#identifier", function() {
		it("returns an identifier for this module", function() {
			const expected = `external "${request}"`;
			expect(externalModule.identifier()).toEqual(expected);
		});
	});

	describe("#readableIdentifier", function() {
		it("returns an identifier for this module", function() {
			const expected = `external "${request}"`;
			expect(externalModule.identifier()).toEqual(expected);
		});
	});

	describe("#needRebuild", function() {
		it("always returns false", function() {
			expect(externalModule.needRebuild()).toEqual(false);
		});
	});

	describe("#size", function() {
		it("always returns 42", function() {
			expect(externalModule.size()).toEqual(42);
		});
	});

	describe("#source", function() {
		it("calls getSource with the result of getSourceString", function() {
			// set up
			const expectedString = "something expected stringy";
			const expectedSource = "something expected sourcy";
			externalModule.getSource = sinon.stub().returns(expectedSource);
			externalModule.getSourceString = sinon.stub().returns(expectedString);

			// invoke
			const result = externalModule.source();

			// check
			expect(externalModule.getSource.callCount).toEqual(1);
			expect(externalModule.getSourceString.callCount).toEqual(1);
			expect(externalModule.getSource.args[0][0]).toEqual(expectedString);
			expect(result).toEqual(expectedSource);
		});
	});

	describe("#getSource", function() {
		describe("given it should use source maps", function() {
			beforeEach(function() {
				externalModule.useSourceMap = true;
			});
			it("returns an instance of OriginalSource", function() {
				// set up
				const someSourceString = "some source string";

				// invoke
				const result = externalModule.getSource(someSourceString);

				// check
				expect(result).toBeInstanceOf(OriginalSource);
			});
		});
		describe("given it does not use source maps", function() {
			beforeEach(function() {
				externalModule.useSourceMap = false;
			});
			it("returns an instance of RawSource", function() {
				// set up
				const someSourceString = "some source string";

				// invoke
				const result = externalModule.getSource(someSourceString);

				// check
				expect(result).toBeInstanceOf(RawSource);
			});
		});
	});

	describe("#getSourceForGlobalVariableExternal", function() {
		describe("given an array as variable name in the global namespace", function() {
			it("use the array as lookup in the global object", function() {
				// set up
				const type = "window";
				const varName = ["foo", "bar"];
				const expected = "(function() { module.exports = window[\"foo\"][\"bar\"]; }());";

				// invoke
				const result = externalModule.getSourceForGlobalVariableExternal(varName, type);

				// check
				expect(result).toEqual(expected);
			});
		});
		describe("given an single variable name", function() {
			it("look it up in the global namespace", function() {
				// set up
				const type = "window";
				const varName = "foo";
				const expected = "(function() { module.exports = window[\"foo\"]; }());";

				// invoke
				const result = externalModule.getSourceForGlobalVariableExternal(varName, type);

				// check
				expect(result).toEqual(expected);
			});
		});
	});

	describe("#getSourceForCommonJsExternal", function() {
		describe("given an array as names in the global namespace", function() {
			it("use the first to require a module and the rest as lookup on the required module", function() {
				// set up
				const varName = ["module", "look", "up"];
				const expected = "module.exports = require(module)[\"look\"][\"up\"];";

				// invoke
				const result = externalModule.getSourceForCommonJsExternal(varName, type);

				// check
				expect(result).toEqual(expected);
			});
		});
		describe("given an single variable name", function() {
			it("require a module with that name", function() {
				// set up
				const type = "window";
				const varName = "foo";
				const expected = "module.exports = require(\"foo\");";

				// invoke
				const result = externalModule.getSourceForCommonJsExternal(varName, type);

				// check
				expect(result).toEqual(expected);
			});
		});
	});

	describe("#checkExternalVariable", function() {
		it("creates a check that fails if a variable does not exist", function() {
			// set up
			const variableToCheck = "foo";
			const request = "bar";
			const expected = `if(typeof foo === 'undefined') {var e = new Error(\"Cannot find module \\\"bar\\\"\"); e.code = 'MODULE_NOT_FOUND'; throw e;}
`;

			// invoke
			const result = externalModule.checkExternalVariable(variableToCheck, request);

			// check
			expect(result).toEqual(expected);
		});
	});

	describe("#getSourceForAmdOrUmdExternal", function() {
		it("looks up a global variable as specified by the id", function() {
			// set up
			const id = "someId";
			const optional = false;
			const expected = "module.exports = __WEBPACK_EXTERNAL_MODULE_someId__;";

			// invoke
			const result = externalModule.getSourceForAmdOrUmdExternal(id, optional, request);

			// check
			expect(result).toEqual(expected);
		});
		describe("given an optinal check is set", function() {
			it("ads a check for the existance of the variable before looking it up", function() {
				// set up
				const id = "someId";
				const optional = true;
				const expected = `if(typeof __WEBPACK_EXTERNAL_MODULE_someId__ === 'undefined') {var e = new Error("Cannot find module \\"some/request\\""); e.code = 'MODULE_NOT_FOUND'; throw e;}
module.exports = __WEBPACK_EXTERNAL_MODULE_someId__;`;

				// invoke
				const result = externalModule.getSourceForAmdOrUmdExternal(id, optional, request);

				// check
				expect(result).toEqual(expected);
			});
		});
	});

	describe("#getSourceForDefaultCase", function() {
		it("returns the given request as lookup", function() {
			// set up
			const optional = false;
			const expected = "module.exports = some/request;";

			// invoke
			const result = externalModule.getSourceForDefaultCase(optional, request);

			// check
			expect(result).toEqual(expected);
		});
		describe("given an optinal check is requested", function() {
			it("checks for the existance of the request setting it", function() {
				// set up
				const optional = true;
				const expected = `if(typeof some/request === 'undefined') {var e = new Error("Cannot find module \\"some/request\\""); e.code = 'MODULE_NOT_FOUND'; throw e;}
module.exports = some/request;`;

				// invoke
				const result = externalModule.getSourceForDefaultCase(optional, request);

				// check
				expect(result).toEqual(expected);
			});
		});
	});

	describe("#getSourceString", function() {
		let globalExternalStub;
		let globalCommonJsStub;
		let globalAmdOrUmdStub;
		let defaultExternalStub;
		beforeEach(function() {
			globalExternalStub = externalModule.getSourceForGlobalVariableExternal = sinon.stub();
			globalCommonJsStub = externalModule.getSourceForCommonJsExternal = sinon.stub();
			globalAmdOrUmdStub = externalModule.getSourceForAmdOrUmdExternal = sinon.stub();
			defaultExternalStub = externalModule.getSourceForDefaultCase = sinon.stub();
		});
		describe("with type being 'this', 'window' or 'global'", function() {
			it("deletgates to #getSourceForGlobalVariableExternal", function() {
				["this", "window", "global"].forEach((type, i) => {
					// set up
					externalModule.type = type;

					// invoke
					externalModule.getSourceString();

					// check
					expect(globalExternalStub.callCount).toEqual(i + 1);
					expect(globalCommonJsStub.callCount).toEqual(0);
					expect(globalAmdOrUmdStub.callCount).toEqual(0);
					expect(defaultExternalStub.callCount).toEqual(0);
				});
			});
		});
		describe("with type being 'commonjs' or 'commonjs2'", function() {
			it("deletgates to #getSourceForCommonJsExternal", function() {
				["commonjs", "commonjs2"].forEach((type, i) => {
					// set up
					externalModule.type = type;

					// invoke
					externalModule.getSourceString();

					// check
					expect(globalExternalStub.callCount).toEqual(0);
					expect(globalCommonJsStub.callCount).toEqual(i + 1);
					expect(globalAmdOrUmdStub.callCount).toEqual(0);
					expect(defaultExternalStub.callCount).toEqual(0);
				});
			});
		});
		describe("with type being 'amd', 'umd' or 'umd2'", function() {
			it("deletgates to #getSourceForAmdOrUmdExternal", function() {
				["amd", "umd", "umd2"].forEach((type, i) => {
					// set up
					externalModule.type = type;

					// invoke
					externalModule.getSourceString();

					// check
					expect(globalExternalStub.callCount).toEqual(0);
					expect(globalCommonJsStub.callCount).toEqual(0);
					expect(globalAmdOrUmdStub.callCount).toEqual(i + 1);
					expect(defaultExternalStub.callCount).toEqual(0);
				});
			});
		});
		describe("with type being non of the above", function() {
			it("deletgates to #getSourceForGlobalVariableExternal", function() {
				["foo", "bar", undefined].forEach((type, i) => {
					// set up
					externalModule.type = type;

					// invoke
					externalModule.getSourceString();

					// check
					expect(globalExternalStub.callCount).toEqual(0);
					expect(globalCommonJsStub.callCount).toEqual(0);
					expect(globalAmdOrUmdStub.callCount).toEqual(0);
					expect(defaultExternalStub.callCount).toEqual(i + 1);
				});
			});
		});
	});
});
