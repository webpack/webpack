"use strict";

const sinon = require("sinon");
const ConcatSource = require("webpack-sources").ConcatSource;
const WebWorkerChunkTemplatePlugin = require("../lib/webworker/WebWorkerChunkTemplatePlugin");
const applyPluginWithOptions = require("./helpers/applyPluginWithOptions");

describe("WebWorkerChunkTemplatePlugin", () => {
	let handlerContext;

	beforeEach(() => {
		handlerContext = {
			outputOptions: {
				chunkCallbackName: "Foo",
				library: "Bar"
			}
		};
	});

	it("has apply function", () => {
		expect((new WebWorkerChunkTemplatePlugin()).apply).toBeInstanceOf(Function);
	});

	describe("when applied", () => {
		let eventBindings, eventBinding;

		beforeEach(() => {
			eventBindings = applyPluginWithOptions(WebWorkerChunkTemplatePlugin);
		});

		it("binds two event handlers", () => {
			expect(eventBindings.length).toBe(2);
		});

		describe("render handler", () => {
			beforeEach(() => {
				eventBinding = eventBindings[0];
			});

			it("binds to render event", () => {
				expect(eventBinding.name).toBe("render");
			});

			describe("with chunk call back name set", () => {
				it("creates source wrapper with function name", () => {
					const source = eventBinding.handler.call(handlerContext, "modules()", {
						ids: 100,
					});
					expect(source).toBeInstanceOf(ConcatSource);
					expect(source.source()).toBe("Foo(100,modules())");
				});
			});

			describe("without chunk call back name set", () => {
				it("creates source wrapper with library name", () => {
					delete handlerContext.outputOptions.chunkCallbackName;
					const source = eventBinding.handler.call(handlerContext, "modules()", {
						ids: 100,
					});
					expect(source).toBeInstanceOf(ConcatSource);
					expect(source.source()).toBe("webpackChunkBar(100,modules())");
				});
			});
		});

		describe("hash handler", () => {
			var hashMock;

			beforeEach(() => {
				eventBinding = eventBindings[1];
				hashMock = {
					update: sinon.spy()
				};
			});

			it("binds to hash event", () => {
				expect(eventBinding.name).toBe("hash");
			});

			it("updates hash object", () => {
				eventBinding.handler.call(handlerContext, hashMock);
				expect(hashMock.update.callCount).toBe(4);
				sinon.assert.calledWith(hashMock.update, "webworker");
				sinon.assert.calledWith(hashMock.update, "3");
				sinon.assert.calledWith(hashMock.update, "Foo");
				sinon.assert.calledWith(hashMock.update, "Bar");
			});
		});
	});
});
