/* globals describe, it, beforeEach, afterEach */
"use strict";

const sinon = require("sinon");
const NormalModule = require("../lib/NormalModule");
const NullDependency = require("../lib/dependencies/NullDependency");
const SourceMapSource = require("webpack-sources").SourceMapSource;
const OriginalSource = require("webpack-sources").OriginalSource;
const RawSource = require("webpack-sources").RawSource;

describe("NormalModule", () => {
	let normalModule;
	let request;
	let userRequest;
	let rawRequest;
	let loaders;
	let resource;
	let parser;
	beforeEach(() => {
		request = "some/request";
		userRequest = "some/userRequest";
		rawRequest = "some/rawRequest";
		loaders = [];
		resource = "some/resource";
		parser = {
			parse() {}
		};
		normalModule = new NormalModule({
			type: "javascript/auto",
			request,
			userRequest,
			rawRequest,
			loaders,
			resource,
			parser,
			generator: null,
			resolveOptions: {}
		});
		normalModule.buildInfo = {
			cacheable: true
		};
	});
	describe("#identifier", () => {
		it("returns an identifier for this module", () => {
			expect(normalModule.identifier()).toBe(request);
		});
		it("returns an identifier from toString", () => {
			normalModule.debugId = 1000;
			expect(normalModule.toString()).toBe("Module[1000]");
			normalModule.id = 1;
			expect(normalModule.toString()).toBe("Module[1]");
		});
	});

	describe("#readableIdentifier", () => {
		it("calls the given requestShortener with the user request", () => {
			const spy = sinon.spy();
			normalModule.readableIdentifier({
				shorten: spy
			});
			expect(spy.callCount).toBe(1);
			expect(spy.args[0][0]).toBe(userRequest);
		});
	});

	describe("#libIdent", () => {
		it("contextifies the userRequest of the module", () => {
			expect(
				normalModule.libIdent({
					context: "some/context"
				})
			).toBe("../userRequest");
		});
		describe("given a userRequest containing loaders", () => {
			beforeEach(() => {
				userRequest =
					"some/userRequest!some/other/userRequest!some/thing/is/off/here";
				normalModule = new NormalModule({
					type: "javascript/auto",
					request,
					userRequest,
					rawRequest,
					loaders,
					resource,
					parser
				});
			});
			it("contextifies every path in the userRequest", () => {
				expect(
					normalModule.libIdent({
						context: "some/context"
					})
				).toBe("../userRequest!../other/userRequest!../thing/is/off/here");
			});
		});
		describe("given a userRequest containing query parameters", () => {
			it("ignores paths in query parameters", () => {
				userRequest =
					"some/context/loader?query=foo\\bar&otherPath=testpath/other";
				normalModule = new NormalModule({
					type: "javascript/auto",
					request,
					userRequest,
					rawRequest,
					loaders,
					resource,
					parser
				});
				expect(
					normalModule.libIdent({
						context: "some/context"
					})
				).toBe("./loader?query=foo\\bar&otherPath=testpath/other");
			});
		});
	});

	describe("#nameForCondition", () => {
		it("return the resource", () => {
			expect(normalModule.nameForCondition()).toBe(resource);
		});
		describe("given a resource containing a ?-sign", () => {
			const baseResource = "some/resource";
			beforeEach(() => {
				resource = baseResource + "?some=query";
				normalModule = new NormalModule({
					type: "javascript/auto",
					request,
					userRequest,
					rawRequest,
					loaders,
					resource,
					parser
				});
			});
			it("return only the part before the ?-sign", () => {
				expect(normalModule.nameForCondition()).toBe(baseResource);
			});
		});
	});

	describe("#createSourceForAsset", () => {
		let name;
		let content;
		let sourceMap;
		beforeEach(() => {
			name = "some name";
			content = "some content";
			sourceMap = "some sourcemap";
		});
		describe("given no sourcemap", () => {
			it("returns a RawSource", () => {
				expect(normalModule.createSourceForAsset(name, content)).toBeInstanceOf(
					RawSource
				);
			});
		});
		describe("given a string as the sourcemap", () => {
			it("returns a OriginalSource", () => {
				expect(
					normalModule.createSourceForAsset(name, content, sourceMap)
				).toBeInstanceOf(OriginalSource);
			});
		});
		describe("given a some other kind of sourcemap", () => {
			beforeEach(() => {
				sourceMap = () => {};
			});
			it("returns a SourceMapSource", () => {
				expect(
					normalModule.createSourceForAsset(name, content, sourceMap)
				).toBeInstanceOf(SourceMapSource);
			});
		});
	});

	describe("#originalSource", () => {
		let expectedSource = "some source";
		beforeEach(() => {
			normalModule._source = new RawSource(expectedSource);
		});
		it("returns an original Source", () => {
			expect(normalModule.originalSource()).toBe(normalModule._source);
		});
	});

	describe("#updateHashWithSource", () => {
		let hashSpy;
		let hash;
		beforeEach(() => {
			hashSpy = sinon.spy();
			hash = {
				update: hashSpy
			};
		});
		describe("without the module having any source", () => {
			beforeEach(() => {
				normalModule._source = null;
			});
			it('calls hash function with "null"', () => {
				normalModule.updateHashWithSource(hash);
				expect(hashSpy.callCount).toBe(1);
				expect(hashSpy.args[0][0]).toBe("null");
			});
		});
		describe("without the module having source", () => {
			let expectedSource = "some source";
			beforeEach(() => {
				normalModule._source = new RawSource(expectedSource);
			});
			it('calls hash function with "source" and then the actual source of the module', function() {
				normalModule.updateHashWithSource(hash);
				expect(hashSpy.callCount).toBe(2);
				expect(hashSpy.args[0][0]).toBe("source");
				expect(hashSpy.args[1][0]).toBe(expectedSource);
			});
		});
	});
	describe("#hasDependencies", () => {
		it("returns true if has dependencies", () => {
			normalModule.addDependency(new NullDependency());
			expect(normalModule.hasDependencies()).toBe(true);
		});
		it("returns false if has dependencies", () => {
			expect(normalModule.hasDependencies()).toBe(false);
		});
	});
	describe("#needRebuild", () => {
		let fileTimestamps;
		let contextTimestamps;
		let fileDependencies;
		let contextDependencies;
		let fileA;
		let fileB;

		function setDeps(fileDependencies, contextDependencies) {
			normalModule.buildInfo.fileDependencies = fileDependencies;
			normalModule.buildInfo.contextDependencies = contextDependencies;
		}

		beforeEach(() => {
			fileA = "fileA";
			fileB = "fileB";
			fileDependencies = [fileA, fileB];
			contextDependencies = [fileA, fileB];
			fileTimestamps = new Map([[fileA, 1], [fileB, 1]]);
			contextTimestamps = new Map([[fileA, 1], [fileB, 1]]);
			normalModule.buildTimestamp = 2;
			setDeps(fileDependencies, contextDependencies);
		});
		describe("given all timestamps are older than the buildTimestamp", () => {
			it("returns false", () => {
				expect(
					normalModule.needRebuild(fileTimestamps, contextTimestamps)
				).toBe(false);
			});
		});
		describe("given a file timestamp is newer than the buildTimestamp", () => {
			beforeEach(() => {
				fileTimestamps.set(fileA, 3);
			});
			it("returns true", () => {
				expect(
					normalModule.needRebuild(fileTimestamps, contextTimestamps)
				).toBe(true);
			});
		});
		describe("given a no file timestamp exists", () => {
			beforeEach(() => {
				fileTimestamps = new Map();
			});
			it("returns true", () => {
				expect(
					normalModule.needRebuild(fileTimestamps, contextTimestamps)
				).toBe(true);
			});
		});
		describe("given a context timestamp is newer than the buildTimestamp", () => {
			beforeEach(() => {
				contextTimestamps.set(fileA, 3);
			});
			it("returns true", () => {
				expect(
					normalModule.needRebuild(fileTimestamps, contextTimestamps)
				).toBe(true);
			});
		});
		describe("given a no context timestamp exists", () => {
			beforeEach(() => {
				contextTimestamps = new Map();
			});
			it("returns true", () => {
				expect(
					normalModule.needRebuild(fileTimestamps, contextTimestamps)
				).toBe(true);
			});
		});
	});

	describe("#applyNoParseRule", () => {
		let rule;
		let content;
		describe("given a string as rule", () => {
			beforeEach(() => {
				rule = "some-rule";
			});
			describe("and the content starting with the string specified in rule", () => {
				beforeEach(() => {
					content = rule + "some-content";
				});
				it("returns true", () => {
					expect(normalModule.shouldPreventParsing(rule, content)).toBe(true);
				});
			});
			describe("and the content does not start with the string specified in rule", () => {
				beforeEach(() => {
					content = "some-content";
				});
				it("returns false", () => {
					expect(normalModule.shouldPreventParsing(rule, content)).toBe(false);
				});
			});
		});
		describe("given a regex as rule", () => {
			beforeEach(() => {
				rule = /some-rule/;
			});
			describe("and the content matches the rule", () => {
				beforeEach(() => {
					content = rule + "some-content";
				});
				it("returns true", () => {
					expect(normalModule.shouldPreventParsing(rule, content)).toBe(true);
				});
			});
			describe("and the content does not match the rule", () => {
				beforeEach(() => {
					content = "some-content";
				});
				it("returns false", () => {
					expect(normalModule.shouldPreventParsing(rule, content)).toBe(false);
				});
			});
		});
	});

	describe("#shouldPreventParsing", () => {
		let applyNoParseRuleSpy;
		beforeEach(() => {
			applyNoParseRuleSpy = sinon.stub();
			normalModule.applyNoParseRule = applyNoParseRuleSpy;
		});
		describe("given no noParseRule", () => {
			it("returns false", () => {
				expect(normalModule.shouldPreventParsing()).toBe(false);
				expect(applyNoParseRuleSpy.callCount).toBe(0);
			});
		});
		describe("given a noParseRule", () => {
			let returnValOfSpy;
			beforeEach(() => {
				returnValOfSpy = true;
				applyNoParseRuleSpy.returns(returnValOfSpy);
			});
			describe("that is a string", () => {
				it("calls and returns whatever applyNoParseRule returns", () => {
					expect(normalModule.shouldPreventParsing("some rule")).toBe(
						returnValOfSpy
					);
					expect(applyNoParseRuleSpy.callCount).toBe(1);
				});
			});
			describe("that is a regex", () => {
				it("calls and returns whatever applyNoParseRule returns", () => {
					expect(normalModule.shouldPreventParsing("some rule")).toBe(
						returnValOfSpy
					);
					expect(applyNoParseRuleSpy.callCount).toBe(1);
				});
			});
			describe("that is an array", () => {
				describe("of strings and or regexs", () => {
					let someRules;
					beforeEach(() => {
						someRules = ["some rule", /some rule1/, "some rule2"];
					});
					describe("and none of them match", () => {
						beforeEach(() => {
							returnValOfSpy = false;
							applyNoParseRuleSpy.returns(returnValOfSpy);
						});
						it("returns false", () => {
							expect(normalModule.shouldPreventParsing(someRules)).toBe(
								returnValOfSpy
							);
							expect(applyNoParseRuleSpy.callCount).toBe(3);
						});
					});
					describe("and the first of them matches", () => {
						beforeEach(() => {
							returnValOfSpy = true;
							applyNoParseRuleSpy.returns(returnValOfSpy);
						});
						it("returns true", () => {
							expect(normalModule.shouldPreventParsing(someRules)).toBe(
								returnValOfSpy
							);
							expect(applyNoParseRuleSpy.callCount).toBe(1);
						});
					});
					describe("and the last of them matches", () => {
						beforeEach(() => {
							returnValOfSpy = true;
							applyNoParseRuleSpy.onCall(0).returns(false);
							applyNoParseRuleSpy.onCall(1).returns(false);
							applyNoParseRuleSpy.onCall(2).returns(true);
						});
						it("returns true", () => {
							expect(normalModule.shouldPreventParsing(someRules)).toBe(
								returnValOfSpy
							);
							expect(applyNoParseRuleSpy.callCount).toBe(3);
						});
					});
				});
			});
		});
	});
});
