"use strict";

const sinon = require("sinon");
const WebWorkerMainTemplatePlugin = require("../lib/webworker/WebWorkerMainTemplatePlugin");
const applyPluginWithOptions = require("./helpers/applyPluginWithOptions");

describe("WebWorkerMainTemplatePlugin", function() {
	let env;

	beforeEach(() => {
		env = {};
	});

	it("has apply function", function() {
		expect((new WebWorkerMainTemplatePlugin()).apply).toBeInstanceOf(Function);
	});

	describe("when applied", function() {
		beforeEach(function() {
			env.eventBindings = applyPluginWithOptions(WebWorkerMainTemplatePlugin);
			env.handlerContext = {
				requireFn: 'requireFn',
				indent: (value) => typeof value === 'string' ? value : value.join("\n"),
				asString: (values) => values.join("\n"),
				renderCurrentHashCode: (value) => value,
				outputOptions: {
					chunkFilename: 'chunkFilename'
				},
				applyPluginsWaterfall: (moduleName, fileName, data) => {
					return `"${moduleName}${data.hash}${data.hashWithLength()}${data.chunk && data.chunk.id || ''}"`;
				},
				renderAddModule: () => 'renderAddModuleSource();',
			};
		});

		it("binds five event handlers", function() {
			expect(env.eventBindings.length).toBe(5);
		});

		describe("local-vars handler", function() {
			beforeEach(() => {
				env.eventBinding = env.eventBindings[0];
			});

			it("binds to local-vars event", () => {
				expect(env.eventBinding.name).toBe("local-vars");
			});

			describe("when no chunks are provided", () => {
				beforeEach(() => {
					const chunk = {
						ids: [],
						chunks: []
					};
					env.source = env.eventBinding.handler.call(env.handlerContext, "moduleSource()", chunk);
				});

				it("returns the original source", () => {
					expect(env.source).toBe("moduleSource()")
				});
			});

			describe("when chunks are provided", () => {
				beforeEach(() => {
					const chunk = {
						ids: [1, 2, 3],
						chunks: [
							'foo',
							'bar',
							'baz'
						]
					};
					env.source = env.eventBinding.handler.call(env.handlerContext, "moduleSource()", chunk, 'abc123');
				});

				it("returns the original source with installed mapping", () => {
					expect(env.source).toMatchSnapshot();
				});
			});
		});

		describe("require-ensure handler", () => {
			beforeEach(() => {
				env.eventBinding = env.eventBindings[1];
			});

			it("binds to require-ensure event", () => {
				expect(env.eventBinding.name).toBe("require-ensure");
			});

			describe("when called", () => {
				beforeEach(() => {
					const chunk = {};
					env.source = env.eventBinding.handler.call(env.handlerContext, "moduleSource()", chunk, 'abc123');
				});

				it("creates import scripts call and promise resolve", () => {
					expect(env.source).toMatchSnapshot();
				});
			});
		});

		describe("bootstrap handler", () => {
			beforeEach(() => {
				env.eventBinding = env.eventBindings[2];
			});

			it("binds to bootstrap event", () => {
				expect(env.eventBinding.name).toBe("bootstrap");
			});

			describe("when no chunks are provided", () => {
				beforeEach(() => {
					const chunk = {
						ids: [],
						chunks: []
					};
					env.source = env.eventBinding.handler.call(env.handlerContext, "moduleSource()", chunk);
				});

				it("returns the original source", () => {
					expect(env.source).toBe("moduleSource()")
				});
			});

			describe("when chunks are provided", () => {
				beforeEach(() => {
					const chunk = {
						ids: [1, 2, 3],
						chunks: [
							'foo',
							'bar',
							'baz'
						]
					};
					env.source = env.eventBinding.handler.call(env.handlerContext, "moduleSource()", chunk);
				});

				it("returns the original source with chunk callback", () => {
					expect(env.source).toMatchSnapshot();
				});
			});
		});

		describe("hot-bootstrap handler", () => {
			beforeEach(() => {
				env.eventBinding = env.eventBindings[3];
			});

			it("binds to hot-bootstrap event", () => {
				expect(env.eventBinding.name).toBe("hot-bootstrap");
			});

			describe("when called", () => {
				beforeEach(() => {
					const chunk = {};
					env.source = env.eventBinding.handler.call(env.handlerContext, "moduleSource()", chunk, 'abc123');
				});

				it("returns the original source with hot update callback", () => {
					expect(env.source).toMatchSnapshot();
				});
			});
		});

		describe("hash handler", () => {
			beforeEach(() => {
				env.eventBinding = env.eventBindings[4];
				env.handlerContext = {
					outputOptions: {
						publicPath: "Alpha",
						filename: "Bravo",
						chunkFilename: "Charlie",
						chunkCallbackName: "Delta",
						library: "Echo"
					}
				};
				env.hashMock = {
					update: sinon.spy()
				};
				env.eventBinding.handler.call(env.handlerContext, env.hashMock);
			});

			it("binds to hash event", () => {
				expect(env.eventBinding.name).toBe("hash");
			});

			it("updates hash object", () => {
				expect(env.hashMock.update.callCount).toBe(7);
				sinon.assert.calledWith(env.hashMock.update, "webworker");
				sinon.assert.calledWith(env.hashMock.update, "3");
				sinon.assert.calledWith(env.hashMock.update, "Alpha");
				sinon.assert.calledWith(env.hashMock.update, "Bravo");
				sinon.assert.calledWith(env.hashMock.update, "Charlie");
				sinon.assert.calledWith(env.hashMock.update, "Delta");
				sinon.assert.calledWith(env.hashMock.update, "Echo");
			});
		});
	});
});
