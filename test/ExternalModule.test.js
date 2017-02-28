/* globals describe, it, beforeEach */
"use strict";
require("should");
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
			externalModule.identifier().should.eql(expected);
		});
	});

	describe("#readableIdentifier", function() {
		it("returns an identifier for this module", function() {
			const expected = `external "${request}"`;
			externalModule.identifier().should.eql(expected);
		});
	});

	describe("#needRebuild", function() {
		it("always returns false", function() {
			externalModule.needRebuild().should.eql(false);
		});
	});

	describe("#size", function() {
		it("always returns 42", function() {
			externalModule.size().should.eql(42);
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
			externalModule.getSource.callCount.should.eql(1);
			externalModule.getSourceString.callCount.should.eql(1);
			externalModule.getSource.args[0][0].should.eql(expectedString);
			result.should.eql(expectedSource);
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
				result.should.be.instanceOf(OriginalSource);
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
				result.should.be.instanceOf(RawSource);
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
				result.should.eql(expected);
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
				result.should.eql(expected);
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
				result.should.eql(expected);
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
				result.should.eql(expected);
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
			result.should.eql(expected);
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
			result.should.eql(expected);
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
				result.should.eql(expected);
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
			result.should.eql(expected);
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
				result.should.eql(expected);
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
					globalExternalStub.callCount.should.eql(i + 1);
					globalCommonJsStub.callCount.should.eql(0);
					globalAmdOrUmdStub.callCount.should.eql(0);
					defaultExternalStub.callCount.should.eql(0);
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
					globalExternalStub.callCount.should.eql(0);
					globalCommonJsStub.callCount.should.eql(i + 1);
					globalAmdOrUmdStub.callCount.should.eql(0);
					defaultExternalStub.callCount.should.eql(0);
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
					globalExternalStub.callCount.should.eql(0);
					globalCommonJsStub.callCount.should.eql(0);
					globalAmdOrUmdStub.callCount.should.eql(i + 1);
					defaultExternalStub.callCount.should.eql(0);
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
					globalExternalStub.callCount.should.eql(0);
					globalCommonJsStub.callCount.should.eql(0);
					globalAmdOrUmdStub.callCount.should.eql(0);
					defaultExternalStub.callCount.should.eql(i + 1);
				});
			});
		});
	});
});
