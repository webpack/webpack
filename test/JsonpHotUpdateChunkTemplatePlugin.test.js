"use strict";

const should = require("should");
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

	it("has apply function", () => (new JsonpHotUpdateChunkTemplatePlugin()).apply.should.be.a.Function());

	describe("when applied", () => {
		let eventBindings, eventBinding;

		beforeEach(() => eventBindings = applyPluginWithOptions(JsonpHotUpdateChunkTemplatePlugin));

		it("binds two event handlers", () => eventBindings.length.should.be.exactly(2));

		describe("render handler", () => {
			beforeEach(() => eventBinding = eventBindings[0]);

			it("binds to render event", () => eventBinding.name.should.be.exactly("render"));

			it("creates source wrapper with export", () => {
				const source = eventBinding.handler.call(handlerContext, "moduleSource()", [], [], {}, 100);
				source.should.be.instanceof(ConcatSource);
				source.source().should.be.exactly("Foo(100,moduleSource())");
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

			it("binds to hash event", () => eventBinding.name.should.be.exactly("hash"));

			it("updates hash object", () => {
				eventBinding.handler.call(handlerContext, hashMock);
				hashMock.update.callCount.should.be.exactly(4);
				sinon.assert.calledWith(hashMock.update, "JsonpHotUpdateChunkTemplatePlugin");
				sinon.assert.calledWith(hashMock.update, "3");
				sinon.assert.calledWith(hashMock.update, "Foo");
				sinon.assert.calledWith(hashMock.update, "Bar");
			});
		});
	});
});
