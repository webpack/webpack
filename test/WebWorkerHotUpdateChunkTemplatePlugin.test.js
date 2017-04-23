"use strict";

const sinon = require("sinon");
const ConcatSource = require("webpack-sources").ConcatSource;
const WebWorkerHotUpdateChunkTemplatePlugin = require("../lib/webworker/WebWorkerHotUpdateChunkTemplatePlugin");
const applyPluginWithOptions = require("./helpers/applyPluginWithOptions");

describe("WebWorkerHotUpdateChunkTemplatePlugin", () => {
	let handlerContext;

	beforeEach(() => {
		handlerContext = {
			outputOptions: {
				hotUpdateFunction: "Foo",
				library: "Bar"
			}
		};
	});

	it("has apply function", () => expect((new WebWorkerHotUpdateChunkTemplatePlugin()).apply).toBeInstanceOf(Function));

	describe("when applied", () => {
		let eventBindings, eventBinding;

		beforeEach(() => eventBindings = applyPluginWithOptions(WebWorkerHotUpdateChunkTemplatePlugin));

		it("binds two event handlers", () => expect(eventBindings.length).toBe(2));

		describe("render handler", () => {
			beforeEach(() => eventBinding = eventBindings[0]);

			it("binds to render event", () => expect(eventBinding.name).toBe("render"));

			describe("with hot update function name set", () => {
				it("creates source wrapper with function name", () => {
					const source = eventBinding.handler.call(handlerContext, "moduleSource()", [], [], {}, 100);
					expect(source).toBeInstanceOf(ConcatSource);
					expect(source.source()).toBe("Foo(100,moduleSource())");
				});
			});

			describe("without hot update function name set", () => {
				it("creates source wrapper with library name", () => {
					delete handlerContext.outputOptions.hotUpdateFunction;
					const source = eventBinding.handler.call(handlerContext, "moduleSource()", [], [], {}, 100);
					expect(source).toBeInstanceOf(ConcatSource);
					expect(source.source()).toBe("webpackHotUpdateBar(100,moduleSource())");
				});
			});
		});

		describe("hash handler", () => {
			let hashMock;

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
				sinon.assert.calledWith(hashMock.update, "WebWorkerHotUpdateChunkTemplatePlugin");
				sinon.assert.calledWith(hashMock.update, "3");
				sinon.assert.calledWith(hashMock.update, "Foo");
				sinon.assert.calledWith(hashMock.update, "Bar");
			});
		});
	});
});
