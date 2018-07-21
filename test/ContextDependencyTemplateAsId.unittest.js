"use strict";

const _ = require("lodash");
const should = require("should");
const sinon = require("sinon");
const ContextDependencyTemplateAsId = require("../lib/dependencies/ContextDependencyTemplateAsId");

const requestShortenerMock = {
	shorten: (request) => `shortened ${request}`
};

describe("ContextDependencyTemplateAsId", () => {
	let env;

	const applyContextDependencyTemplateAsId = function() {
		const contextDependencyTemplateAsId = new ContextDependencyTemplateAsId();
		const args = [].slice.call(arguments).concat(requestShortenerMock);
		contextDependencyTemplateAsId.apply.apply(contextDependencyTemplateAsId, args);
	};

	beforeEach(() => {
		env = {
			source: {
				replace: sinon.stub()
			},
			outputOptions: {
				pathinfo: true
			},
			module: {
				id: "123",
				dependencies: [
					"myModuleDependency"
				]
			},
			baseDependency: {
				range: [1, 25],
				request: "myModule"
			}
		};
	});

	it("has apply function", () => {
		(new ContextDependencyTemplateAsId()).apply.should.be.a.Function();
	});

	describe("when applied", () => {
		describe("with module missing depedencies", () => {
			beforeEach(() => {
				applyContextDependencyTemplateAsId(env.baseDependency, env.source, env.outputOptions);
			});

			it("replaces source with missing module error", () => {
				env.source.replace.callCount.should.be.exactly(1);
				sinon.assert.calledWith(env.source.replace, 1, 24, '!(function webpackMissingModule() { var e = new Error("Cannot find module \\"myModule\\""); e.code = \'MODULE_NOT_FOUND\'; throw e; }())');
			});
		});

		describe("with module which does not have a value range", () => {
			beforeEach(() => {
				env.dependency = _.extend(env.baseDependency, {
					prepend: "prepend value",
					module: env.module
				});
			});

			describe("and path info true", function() {
				beforeEach(function() {
					env.outputOptions.pathinfo = true;
					applyContextDependencyTemplateAsId(env.dependency, env.source, env.outputOptions);
				});

				it("replaces source with webpack require with comment", () => {
					env.source.replace.callCount.should.be.exactly(1);
					sinon.assert.calledWith(env.source.replace, 1, 24, '__webpack_require__(/*! shortened myModule */ "123").resolve');
				});
			});

			describe("and path info false", function() {
				beforeEach(function() {
					env.outputOptions.pathinfo = false;
					applyContextDependencyTemplateAsId(env.dependency, env.source, env.outputOptions);
				});

				it("replaces source with webpack require without comment", () => {
					env.source.replace.callCount.should.be.exactly(1);
					sinon.assert.calledWith(env.source.replace, 1, 24, '__webpack_require__("123").resolve');
				});
			});
		});

		describe("with module which has a value range", () => {
			describe("with no replacements", () => {
				beforeEach(() => {
					const dependency = _.extend(env.baseDependency, {
						valueRange: [8, 18],
						prepend: "prepend value",
						module: env.module
					});

					applyContextDependencyTemplateAsId(dependency, env.source, env.outputOptions);
				});

				it("replaces source with webpack require and wraps value", () => {
					env.source.replace.callCount.should.be.exactly(2);
					sinon.assert.calledWith(env.source.replace, 18, 24, ")");
					sinon.assert.calledWith(env.source.replace, 1, 7, '__webpack_require__(/*! shortened myModule */ "123").resolve("prepend value"');
				});
			});

			describe("with replacements", () => {
				beforeEach(() => {
					const dependency = _.extend(env.baseDependency, {
						valueRange: [8, 18],
						replaces: [{
								value: "foo",
								range: [9, 11]
							},
							{
								value: "bar",
								range: [13, 15]
							}
						],
						prepend: "prepend value",
						module: env.module
					});

					applyContextDependencyTemplateAsId(dependency, env.source, env.outputOptions);
				});

				it("replaces source with webpack require, wraps value and make replacements", () => {
					env.source.replace.callCount.should.be.exactly(4);
					sinon.assert.calledWith(env.source.replace, 9, 10, "foo");
					sinon.assert.calledWith(env.source.replace, 13, 14, "bar");
					sinon.assert.calledWith(env.source.replace, 18, 24, ")");
					sinon.assert.calledWith(env.source.replace, 1, 7, '__webpack_require__(/*! shortened myModule */ "123").resolve("prepend value"');
				});
			});
		});
	});
});
