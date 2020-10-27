"use strict";

const NormalModule = require("../lib/NormalModule");
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
		request = "/some/request";
		userRequest = "/some/userRequest";
		rawRequest = "some/rawRequest";
		loaders = [];
		resource = "/some/resource";
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
		normalModule.useSimpleSourceMap = true;
	});
	describe("#identifier", () => {
		it("returns an identifier for this module", () => {
			expect(normalModule.identifier()).toBe(request);
		});
		it("returns an identifier from toString", () => {
			normalModule.debugId = 1000;
			expect(normalModule.toString()).toBe("Module[1000: /some/request]");
		});
	});

	describe("#readableIdentifier", () => {
		it("calls the given requestShortener with the user request", () => {
			const spy = jest.fn();
			normalModule.readableIdentifier({
				shorten: spy
			});
			expect(spy.mock.calls.length).toBe(1);
			expect(spy.mock.calls[0][0]).toBe(userRequest);
		});
	});

	describe("#libIdent", () => {
		it("contextifies the userRequest of the module", () => {
			expect(
				normalModule.libIdent({
					context: "/some/context"
				})
			).toBe("../userRequest");
		});
		describe("given a userRequest containing loaders", () => {
			beforeEach(() => {
				userRequest =
					"/some/userRequest!/some/other/userRequest!/some/thing/is/off/here";
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
						context: "/some/context"
					})
				).toBe("../userRequest!../other/userRequest!../thing/is/off/here");
			});
		});
		describe("given a userRequest containing query parameters", () => {
			it("ignores paths in query parameters", () => {
				userRequest =
					"F:\\some\\context\\loader?query=foo\\bar&otherPath=testpath/other";
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
						context: "F:\\some\\context"
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
				expect(
					normalModule.createSourceForAsset("/", name, content)
				).toBeInstanceOf(RawSource);
			});
		});
		describe("given a string as the sourcemap", () => {
			it("returns a OriginalSource", () => {
				expect(
					normalModule.createSourceForAsset("/", name, content, sourceMap)
				).toBeInstanceOf(OriginalSource);
			});
		});
		describe("given a some other kind of sourcemap (source maps disabled)", () => {
			beforeEach(() => {
				sourceMap = () => {};
				normalModule.useSimpleSourceMap = false;
			});
			it("returns a SourceMapSource", () => {
				expect(
					normalModule.createSourceForAsset("/", name, content, sourceMap)
				).toBeInstanceOf(RawSource);
			});
		});
		describe("given a some other kind of sourcemap (simple source maps enabled)", () => {
			beforeEach(() => {
				sourceMap = () => {};
			});
			it("returns a SourceMapSource", () => {
				expect(
					normalModule.createSourceForAsset("/", name, content, sourceMap)
				).toBeInstanceOf(RawSource);
			});
		});
		describe("given a some other kind of sourcemap (source maps enabled)", () => {
			beforeEach(() => {
				sourceMap = () => {};
				normalModule.useSourceMap = true;
			});
			it("returns a SourceMapSource", () => {
				expect(
					normalModule.createSourceForAsset("/", name, content, sourceMap)
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
			applyNoParseRuleSpy = jest.fn();
			normalModule.applyNoParseRule = applyNoParseRuleSpy;
		});
		describe("given no noParseRule", () => {
			it("returns false", () => {
				expect(normalModule.shouldPreventParsing()).toBe(false);
				expect(applyNoParseRuleSpy.mock.calls.length).toBe(0);
			});
		});
		describe("given a noParseRule", () => {
			let returnValOfSpy;
			beforeEach(() => {
				returnValOfSpy = true;
				applyNoParseRuleSpy.mockReturnValue(returnValOfSpy);
			});
			describe("that is a string", () => {
				it("calls and returns whatever applyNoParseRule returns", () => {
					expect(normalModule.shouldPreventParsing("some rule")).toBe(
						returnValOfSpy
					);
					expect(applyNoParseRuleSpy.mock.calls.length).toBe(1);
				});
			});
			describe("that is a regex", () => {
				it("calls and returns whatever applyNoParseRule returns", () => {
					expect(normalModule.shouldPreventParsing("some rule")).toBe(
						returnValOfSpy
					);
					expect(applyNoParseRuleSpy.mock.calls.length).toBe(1);
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
							applyNoParseRuleSpy.mockReturnValue(returnValOfSpy);
						});
						it("returns false", () => {
							expect(normalModule.shouldPreventParsing(someRules)).toBe(
								returnValOfSpy
							);
							expect(applyNoParseRuleSpy.mock.calls.length).toBe(3);
						});
					});
					describe("and the first of them matches", () => {
						beforeEach(() => {
							returnValOfSpy = true;
							applyNoParseRuleSpy.mockReturnValue(returnValOfSpy);
						});
						it("returns true", () => {
							expect(normalModule.shouldPreventParsing(someRules)).toBe(
								returnValOfSpy
							);
							expect(applyNoParseRuleSpy.mock.calls.length).toBe(1);
						});
					});
					describe("and the last of them matches", () => {
						beforeEach(() => {
							returnValOfSpy = true;
							applyNoParseRuleSpy.mockReturnValueOnce(false);
							applyNoParseRuleSpy.mockReturnValueOnce(false);
							applyNoParseRuleSpy.mockReturnValue(true);
						});
						it("returns true", () => {
							expect(normalModule.shouldPreventParsing(someRules)).toBe(
								returnValOfSpy
							);
							expect(applyNoParseRuleSpy.mock.calls.length).toBe(3);
						});
					});
				});
			});
		});
	});
});
