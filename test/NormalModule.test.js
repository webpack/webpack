/* globals describe, it, beforeEach, afterEach */
"use strict";
const sinon = require("sinon");
const NormalModule = require("../lib/NormalModule");
const NullDependency = require("../lib/dependencies/NullDependency");
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
			parse() {}
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
			expect(normalModule.identifier()).toEqual(request);
		});
		it("returns an identifier from toString", function() {
			normalModule.debugId = 1000;
			expect(normalModule.toString()).toEqual("Module[1000]");
			normalModule.id = 1;
			expect(normalModule.toString()).toEqual("Module[1]");
		});
	});

	describe("#readableIdentifier", function() {
		it("calls the given requestShortener with the user request", function() {
			const spy = sinon.spy();
			normalModule.readableIdentifier({
				shorten: spy
			});
			expect(spy.callCount).toEqual(1);
			expect(spy.args[0][0]).toEqual(userRequest);
		});
	});

	describe("#libIdent", function() {
		it("contextifies the userRequest of the module", function() {
			expect(normalModule.libIdent({
				context: "some/context"
			})).toEqual("../userRequest");
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
				expect(normalModule.libIdent({
					context: "some/context"
				})).toEqual("../userRequest!../other/userRequest!../thing/is/off/here");
			});
		});
	});

	describe("#nameForCondition", function() {
		it("return the resource", function() {
			expect(normalModule.nameForCondition()).toEqual(resource);
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
				expect(normalModule.nameForCondition()).toEqual(baseResource);
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
				expect(normalModule.createSourceForAsset(name, content)).toBeInstanceOf(RawSource);
			});
		});
		describe("given a string as the sourcemap", function() {
			it("returns a OriginalSource", function() {
				expect(normalModule.createSourceForAsset(name, content, sourceMap)).toBeInstanceOf(OriginalSource);
			});
		});
		describe("given a some other kind of sourcemap", function() {
			beforeEach(function() {
				sourceMap = () => {};
			});
			it("returns a SourceMapSource", function() {
				expect(normalModule.createSourceForAsset(name, content, sourceMap)).toBeInstanceOf(SourceMapSource);
			});
		});
	});

	describe("#source", function() {
		describe("without the module having any source", function() {
			beforeEach(function() {
				normalModule._source = null;
			});
			it("returns a Source containing an Error", function() {
				expect(normalModule.source()).toBeInstanceOf(RawSource);
				expect(normalModule.source().source()).toEqual("throw new Error('No source available');");
			});
		});
	});

	describe("#originalSource", function() {
		let expectedSource = "some source";
		beforeEach(function() {
			normalModule._source = new RawSource(expectedSource);
		});
		it("returns an original Source", function() {
			expect(normalModule.originalSource()).toEqual(normalModule._source);
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
				expect(hashSpy.callCount).toEqual(1);
				expect(hashSpy.args[0][0]).toEqual("null");
			});
		});
		describe("without the module having source", function() {
			let expectedSource = "some source";
			beforeEach(function() {
				normalModule._source = new RawSource(expectedSource);
			});
			it("calls hash function with \"source\" and then the actual source of the module", function() {
				normalModule.updateHashWithSource(hash);
				expect(hashSpy.callCount).toEqual(2);
				expect(hashSpy.args[0][0]).toEqual("source");
				expect(hashSpy.args[1][0]).toEqual(expectedSource);
			});
		});
	});
	describe("#hasDependencies", function() {
		it("returns true if has dependencies", function() {
			normalModule.addDependency(new NullDependency());
			expect(normalModule.hasDependencies()).toEqual(true);
		});
		it("returns false if has dependencies", function() {
			expect(normalModule.hasDependencies()).toEqual(false);
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
			fileDependencies = [fileA, fileB];
			contextDependencies = [fileA, fileB];
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
				expect(normalModule.needRebuild(fileTimestamps, contextTimestamps)).toEqual(false);
			});
		});
		describe("given a file timestamp is newer than the buildTimestamp", function() {
			beforeEach(function() {
				fileTimestamps[fileA] = 3;
			});
			it("returns true", function() {
				expect(normalModule.needRebuild(fileTimestamps, contextTimestamps)).toEqual(true);
			});
		});
		describe("given a no file timestamp exists", function() {
			beforeEach(function() {
				fileTimestamps = {};
			});
			it("returns true", function() {
				expect(normalModule.needRebuild(fileTimestamps, contextTimestamps)).toEqual(true);
			});
		});
		describe("given a context timestamp is newer than the buildTimestamp", function() {
			beforeEach(function() {
				contextTimestamps[fileA] = 3;
			});
			it("returns true", function() {
				expect(normalModule.needRebuild(fileTimestamps, contextTimestamps)).toEqual(true);
			});
		});
		describe("given a no context timestamp exists", function() {
			beforeEach(function() {
				contextTimestamps = {};
			});
			it("returns true", function() {
				expect(normalModule.needRebuild(fileTimestamps, contextTimestamps)).toEqual(true);
			});
		});
	});
	describe("#splitVariablesInUniqueNamedChunks", function() {
		let variables;
		beforeEach(function() {
			variables = [{
				name: "foo"
			}, {
				name: "bar"
			}, {
				name: "baz"
			}, {
				name: "some"
			}, {
				name: "more"
			}];
		});
		describe("given an empty array of vars", function() {
			it("returns an empty array", function() {
				expect(normalModule.splitVariablesInUniqueNamedChunks([])).toEqual([
					[]
				]);
			});
		});
		describe("given an array of distrinct variables", function() {
			it("returns an array containing an array containing the variables", function() {
				expect(normalModule.splitVariablesInUniqueNamedChunks(variables)).toEqual([variables]);
			});
		});
		describe("given an array with duplicate variables", function() {
			it("returns several arrays each containing only distinct variable names", function() {
				expect(normalModule.splitVariablesInUniqueNamedChunks(variables.concat(variables))).toEqual([variables, variables]);
			});
			describe("and a duplicate as the last variable", function() {
				it("returns correctly split distinct arrays", function() {
					expect(normalModule.splitVariablesInUniqueNamedChunks(variables.concat(variables).concat(variables[0]))).toEqual([variables, variables, [variables[0]]]);
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
					expect(normalModule.shouldPreventParsing(rule, content)).toEqual(true);
				});
			});
			describe("and the content does not start with the string specified in rule", function() {
				beforeEach(function() {
					content = "some-content";
				});
				it("returns false", function() {
					expect(normalModule.shouldPreventParsing(rule, content)).toEqual(false);
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
					expect(normalModule.shouldPreventParsing(rule, content)).toEqual(true);
				});
			});
			describe("and the content does not match the rule", function() {
				beforeEach(function() {
					content = "some-content";
				});
				it("returns false", function() {
					expect(normalModule.shouldPreventParsing(rule, content)).toEqual(false);
				});
			});
		});
	});

	describe("#shouldPreventParsing", function() {
		let applyNoParseRuleSpy;
		beforeEach(function() {
			applyNoParseRuleSpy = sinon.stub();
			normalModule.applyNoParseRule = applyNoParseRuleSpy;
		});
		describe("given no noParseRule", function() {
			it("returns false", function() {
				expect(normalModule.shouldPreventParsing()).toEqual(false);
				expect(applyNoParseRuleSpy.callCount).toEqual(0);
			});
		});
		describe("given a noParseRule", function() {
			let returnValOfSpy;
			beforeEach(function() {
				returnValOfSpy = true;
				applyNoParseRuleSpy.returns(returnValOfSpy);
			});
			describe("that is a string", function() {
				it("calls and returns whatever applyNoParseRule returns", function() {
					expect(normalModule.shouldPreventParsing("some rule")).toEqual(returnValOfSpy);
					expect(applyNoParseRuleSpy.callCount).toEqual(1);
				});
			});
			describe("that is a regex", function() {
				it("calls and returns whatever applyNoParseRule returns", function() {
					expect(normalModule.shouldPreventParsing("some rule")).toEqual(returnValOfSpy);
					expect(applyNoParseRuleSpy.callCount).toEqual(1);
				});
			});
			describe("that is an array", function() {
				describe("of strings and or regexs", function() {
					let someRules;
					beforeEach(function() {
						someRules = [
							"some rule",
							/some rule1/,
							"some rule2",
						];
					});
					describe("and none of them match", function() {
						beforeEach(function() {
							returnValOfSpy = false;
							applyNoParseRuleSpy.returns(returnValOfSpy);
						});
						it("returns false", function() {
							expect(normalModule.shouldPreventParsing(someRules)).toEqual(returnValOfSpy);
							expect(applyNoParseRuleSpy.callCount).toEqual(3);
						});
					});
					describe("and the first of them matches", function() {
						beforeEach(function() {
							returnValOfSpy = true;
							applyNoParseRuleSpy.returns(returnValOfSpy);
						});
						it("returns true", function() {
							expect(normalModule.shouldPreventParsing(someRules)).toEqual(returnValOfSpy);
							expect(applyNoParseRuleSpy.callCount).toEqual(1);
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
							expect(normalModule.shouldPreventParsing(someRules)).toEqual(returnValOfSpy);
							expect(applyNoParseRuleSpy.callCount).toEqual(3);
						});
					});
				});
			});
		});
	});
});
