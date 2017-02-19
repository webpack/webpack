/* globals describe, it, beforeEach, afterEach */
"use strict";
require("should");
const sinon = require("sinon");
const ExternalModule = require("../lib/ExternalModule");
const path = require("path");
const SourceMapSource = require("webpack-sources").SourceMapSource;
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
			const expected = "if(typeof foo === 'undefined') {var e = new Error(\"Cannot find module \\\"bar\\\"\"); e.code = 'MODULE_NOT_FOUND'; throw e;}";

			// invoke
			const result = externalModule.checkExternalVariable(variableToCheck, request);

			// check
			result.should.eql(expected);
		});
	});
});
