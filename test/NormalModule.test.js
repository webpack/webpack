/* globals describe, it, beforeEach, afterEach */
"use strict";
require("should");
const sinon = require("sinon");
const NormalModule = require("../lib/NormalModule");
const path = require("path");
const SourceMapSource = require("webpack-sources").SourceMapSource;
const OriginalSource = require("webpack-sources").OriginalSource;
const RawSource = require("webpack-sources").RawSource;

describe("NormalModule", function() {
	let normalModule;
	let request;
	let userRequest;
	let rawRequest;
	let loaders;
	let resource;
	let parser;
	beforeEach(function() {
		request = "some/request";
		userRequest = "some/userRequest";
		rawRequest = "some/rawRequest";
		loaders = [];
		resource = "some/resource";
		parser = {
			parser() {}
		};
		normalModule = new NormalModule(
			request,
			userRequest,
			rawRequest,
			loaders,
			resource,
			parser
		);
	});
	describe("#identifier", function() {
		it("returns an identifier for this module", function() {
			normalModule.identifier().should.eql(request);
		});
	});

	describe("#readableIdentifier", function() {
		it("calls the given requestShortener with the user request", function() {
			const spy = sinon.spy();
			normalModule.readableIdentifier({
				shorten: spy
			});
			spy.callCount.should.eql(1);
			spy.args[0][0].should.eql(userRequest);
		});
	});

	describe("#libIdent", function() {
		it("contextifies the userRequest of the module", function() {
			normalModule.libIdent({
				context: "some/context"
			}).should.eql("../userRequest");
		});
		describe("given a userRequest containing loaders", function() {
			beforeEach(function() {
				userRequest = "some/userRequest!some/other/userRequest!some/thing/is/off/here";
				normalModule = new NormalModule(
					request,
					userRequest,
					rawRequest,
					loaders,
					resource,
					parser
				);
			});
			it("contextifies every path in the userRequest", function() {
				normalModule.libIdent({
					context: "some/context"
				}).should.eql("../userRequest!../other/userRequest!../thing/is/off/here");
			});
		});

		describe("when running on a windows machine", function() {
			let sep;
			beforeEach(function() {
				userRequest = "some\\userRequest!some\\other\\userRequest!some\\thing\\is\\off\\here";
				sep = path.sep;
				path.sep = "\\";
				normalModule = new NormalModule(
					request,
					userRequest,
					rawRequest,
					loaders,
					resource,
					parser
				);
			});
			afterEach(function() {
				path.sep = sep;
			});
			it("contextifies every path in the userRequest", function() {
				normalModule.libIdent({
					context: "some/context"
				}).should.eql("../../some/userRequest!../../some/other/userRequest!../../some/thing/is/off/here");
			});
		});
	});

	describe("#nameForCondition", function() {
		it("return the resource", function() {
			normalModule.nameForCondition().should.eql(resource);
		});
		describe("given a resource containing a ?-sign", function() {
			const baseResource = "some/resource";
			beforeEach(function() {
				resource = baseResource + "?some=query";
				normalModule = new NormalModule(
					request,
					userRequest,
					rawRequest,
					loaders,
					resource,
					parser
				);
			});
			it("return only the part before the ?-sign", function() {
				normalModule.nameForCondition().should.eql(baseResource);
			});
		});
	});

	describe("#createSourceForAsset", function() {
		let name;
		let content;
		let sourceMap;
		beforeEach(function() {
			name = "some name";
			content = "some content";
			sourceMap = "some sourcemap";
		});
		describe("given no sourcemap", function() {
			it("returns a RawSource", function() {
				normalModule.createSourceForAsset(name, content).should.be.instanceOf(RawSource);
			});
		});
		describe("given a string as the sourcemap", function() {
			it("returns a OriginalSource", function() {
				normalModule.createSourceForAsset(name, content, sourceMap).should.be.instanceOf(OriginalSource);
			});
		});
		describe("given a some other kind of sourcemap", function() {
			beforeEach(function() {
				sourceMap = () => {};
			});
			it("returns a SourceMapSource", function() {
				normalModule.createSourceForAsset(name, content, sourceMap).should.be.instanceOf(SourceMapSource);
			});
		});
	});

	describe("#source", function() {
		describe("without the module having any source", function() {
			beforeEach(function() {
				normalModule._source = null;
			});
			it("returns a Source containing an Error", function() {
				normalModule.source().should.be.instanceOf(RawSource);
				normalModule.source().source().should.eql("throw new Error('No source available');");
			});
		});
	});

	describe("#updateHashWithSource", function() {
		let hashSpy;
		let hash;
		beforeEach(function() {
			hashSpy = sinon.spy();
			hash = {
				update: hashSpy
			};
		});
		describe("without the module having any source", function() {
			beforeEach(function() {
				normalModule._source = null;
			});
			it("calls hash function with \"null\"", function() {
				normalModule.updateHashWithSource(hash);
				hashSpy.callCount.should.eql(1);
				hashSpy.args[0][0].should.eql("null");
			});
		});
		describe("without the module having source", function() {
			let expectedSource = "wurst suppe";
			beforeEach(function() {
				normalModule._source = new RawSource(expectedSource);
			});
			it("calls hash function with \"source\" and then the actual source of the module", function() {
				normalModule.updateHashWithSource(hash);
				hashSpy.callCount.should.eql(2);
				hashSpy.args[0][0].should.eql("source");
				hashSpy.args[1][0].should.eql(expectedSource);
			});
		});
	});
	describe("#needRebuild", function() {
		let fileTimestamps;
		let contextTimestamps;
		let fileDependencies;
		let contextDependencies;
		let fileA;
		let fileB;
		function setDeps(
			fileDependencies,
			contextDependencies) {
			normalModule.fileDependencies = fileDependencies;
			normalModule.contextDependencies = contextDependencies;
		}
		beforeEach(function() {
			fileA = "fileA";
			fileB = "fileB";
			fileDependencies = [ fileA, fileB ];
			contextDependencies = [ fileA, fileB ];
			fileTimestamps = {
				[fileA]: 1,
				[fileB]: 1,
			};
			contextTimestamps = {
				[fileA]: 1,
				[fileB]: 1,
			};
			normalModule.buildTimestamp = 2;
			setDeps(fileDependencies, contextDependencies);
		});
		describe("given all timestamps are older than the buildTimestamp", function() {
			it("returns false", function() {
				normalModule.needRebuild(fileTimestamps, contextTimestamps).should.eql(false);
			});
		});
		describe("given a file timestamp is newer than the buildTimestamp", function() {
			beforeEach(function() {
				fileTimestamps[fileA] = 3;
			});
			it("returns true", function() {
				normalModule.needRebuild(fileTimestamps, contextTimestamps).should.eql(true);
			});
		});
		describe("given a no file timestamp exists", function() {
			beforeEach(function() {
				fileTimestamps = {};
			});
			it("returns true", function() {
				normalModule.needRebuild(fileTimestamps, contextTimestamps).should.eql(true);
			});
		});
		describe("given a context timestamp is newer than the buildTimestamp", function() {
			beforeEach(function() {
				contextTimestamps[fileA] = 3;
			});
			it("returns true", function() {
				normalModule.needRebuild(fileTimestamps, contextTimestamps).should.eql(true);
			});
		});
		describe("given a no context timestamp exists", function() {
			beforeEach(function() {
				contextTimestamps = {};
			});
			it("returns true", function() {
				normalModule.needRebuild(fileTimestamps, contextTimestamps).should.eql(true);
			});
		});
	});
	describe("#splitVariablesInUniqueNamedChunks", function() {
		let variables;
		beforeEach(function() {
			variables = [
				{ name: "foo" },
				{ name: "bar" },
				{ name: "baz" },
				{ name: "wurst" },
				{ name: "suppe" }
			];
		});
		describe("given an empty array of vars", function() {
			it("returns an empty array", function() {
				normalModule.splitVariablesInUniqueNamedChunks([]).should.eql([]);
			});
		});
		describe("given an array of distrinct variables", function() {
			it("returns an array containing an array containing the variables", function() {
				normalModule.splitVariablesInUniqueNamedChunks(variables).should.eql([variables]);
			});
		});
		describe("given an array with duplicate variables", function() {
			it("returns several arrays each containing only distinct variable names", function() {
				normalModule.splitVariablesInUniqueNamedChunks(variables.concat(variables)).should.eql([variables, variables]);
			});
			describe("and a duplicate as the last variable", function() {
				it("returns correctly split distinct arrays", function() {
					normalModule.splitVariablesInUniqueNamedChunks(variables.concat(variables).concat(variables[0])).should.eql([variables, variables, [variables[0]]]);
				});
			});
		});
	});

	describe("#applyNoParseRule", function() {
		let rule;
		let content;
		describe("given a string as rule", function() {
			beforeEach(function() {
				rule = "some-rule";
			});
			describe("and the content starting with the string specified in rule", function() {
				beforeEach(function() {
					content = rule + "some-content";
				});
				it("returns true", function() {
					normalModule.preventParsing(rule, content).should.eql(true);
				});
			});
			describe("and the content does not start with the string specified in rule", function() {
				beforeEach(function() {
					content = "some-content";
				});
				it("returns false", function() {
					normalModule.preventParsing(rule, content).should.eql(false);
				});
			});
		});
		describe("given a regex as rule", function() {
			beforeEach(function() {
				rule = /some-rule/;
			});
			describe("and the content matches the rule", function() {
				beforeEach(function() {
					content = rule + "some-content";
				});
				it("returns true", function() {
					normalModule.preventParsing(rule, content).should.eql(true);
				});
			});
			describe("and the content does not match the rule", function() {
				beforeEach(function() {
					content = "some-content";
				});
				it("returns false", function() {
					normalModule.preventParsing(rule, content).should.eql(false);
				});
			});
		});
	});

	describe("#preventParsing", function() {
		let applyNoParseRuleSpy;
		beforeEach(function() {
			applyNoParseRuleSpy = sinon.stub();
			normalModule.applyNoParseRule = applyNoParseRuleSpy;
		});
		describe("given no noParseRule", function() {
			it("returns false", function() {
				normalModule.preventParsing().should.eql(false);
				applyNoParseRuleSpy.callCount.should.eql(0);
			});
		});
		describe("given a noParseRule", function() {
			let returnValOfSpy;
			beforeEach(function() {
				returnValOfSpy = Math.random() >= 0.5 ? true : false;
				applyNoParseRuleSpy.returns(returnValOfSpy);
			});
			describe("that is a string", function() {
				it("calls and returns whatever applyNoParseRule returns", function() {
					normalModule.preventParsing("some rule").should.eql(returnValOfSpy);
					applyNoParseRuleSpy.callCount.should.eql(1);
				});
			});
			describe("that is a regex", function() {
				it("calls and returns whatever applyNoParseRule returns", function() {
					normalModule.preventParsing("some rule").should.eql(returnValOfSpy);
					applyNoParseRuleSpy.callCount.should.eql(1);
				});
			});
			describe("that is an array", function() {
				describe("of strings and or regexs", function() {
					let someRules;
					beforeEach(function() {
						someRules = [
							Math.random() >= 0.5 ? "some rule" : /some rule/,
							Math.random() >= 0.5 ? "some rule1" : /some rule1/,
							Math.random() >= 0.5 ? "some rule2" : /some rule2/,
						];
					});
					describe("and none of them match", function() {
						beforeEach(function() {
							returnValOfSpy = false;
							applyNoParseRuleSpy.returns(returnValOfSpy);
						});
						it("returns false", function() {
							normalModule.preventParsing(someRules).should.eql(returnValOfSpy);
							applyNoParseRuleSpy.callCount.should.eql(3);
						});
					});
					describe("and the first of them matches", function() {
						beforeEach(function() {
							returnValOfSpy = true;
							applyNoParseRuleSpy.returns(returnValOfSpy);
						});
						it("returns true", function() {
							normalModule.preventParsing(someRules).should.eql(returnValOfSpy);
							applyNoParseRuleSpy.callCount.should.eql(1);
						});
					});
					describe("and the last of them matches", function() {
						beforeEach(function() {
							returnValOfSpy = true;
							applyNoParseRuleSpy.onCall(0).returns(false);
							applyNoParseRuleSpy.onCall(1).returns(false);
							applyNoParseRuleSpy.onCall(2).returns(true);
						});
						it("returns true", function() {
							normalModule.preventParsing(someRules).should.eql(returnValOfSpy);
							applyNoParseRuleSpy.callCount.should.eql(3);
						});
					});
				});
			});
		});
	});
});
