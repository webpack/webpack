"use strict";

const sinon = require("sinon");
const ConcatSource = require("webpack-sources").ConcatSource;
const JsonpHotUpdateChunkTemplatePlugin = require("../lib/JsonpHotUpdateChunkTemplatePlugin");
const applyPluginWithOptions = require("./helpers/applyPluginWithOptions");

describe("JsonpHotUpdateChunkTemplatePlugin", () => {
	let handlerContext;

	beforeEach(() =>
		handlerContext = {
			outputOptions: {
				hotUpdateFunction: "Foo",
				library: "Bar"
			}
		});

	it("has apply function", () => expect((new JsonpHotUpdateChunkTemplatePlugin()).apply).toBeInstanceOf(Function));

	describe("when applied", () => {
		let eventBindings, eventBinding;

		beforeEach(() => eventBindings = applyPluginWithOptions(JsonpHotUpdateChunkTemplatePlugin));

		it("binds two event handlers", () => expect(eventBindings.length).toBe(2));

		describe("render handler", () => {
			beforeEach(() => eventBinding = eventBindings[0]);

			it("binds to render event", () => expect(eventBinding.name).toBe("render"));

			it("creates source wrapper with export", () => {
				const source = eventBinding.handler.call(handlerContext, "moduleSource()", [], [], {}, 100);
				expect(source).toBeInstanceOf(ConcatSource);
				expect(source.source()).toBe("Foo(100,moduleSource())");
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

			it("binds to hash event", () => expect(eventBinding.name).toBe("hash"));

			it("updates hash object", () => {
				eventBinding.handler.call(handlerContext, hashMock);
				expect(hashMock.update.callCount).toBe(4);
				sinon.assert.calledWith(hashMock.update, "JsonpHotUpdateChunkTemplatePlugin");
				sinon.assert.calledWith(hashMock.update, "3");
				sinon.assert.calledWith(hashMock.update, "Foo");
				sinon.assert.calledWith(hashMock.update, "Bar");
			});
		});
	});
});
