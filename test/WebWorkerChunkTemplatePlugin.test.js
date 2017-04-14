"use strict";

const should = require("should");
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
		(new WebWorkerChunkTemplatePlugin()).apply.should.be.a.Function();
	});

	describe("when applied", () => {
		let eventBindings, eventBinding;

		beforeEach(() => {
			eventBindings = applyPluginWithOptions(WebWorkerChunkTemplatePlugin);
		});

		it("binds two event handlers", () => {
			eventBindings.length.should.be.exactly(2);
		});

		describe("render handler", () => {
			beforeEach(() => {
				eventBinding = eventBindings[0];
			});

			it("binds to render event", () => {
				eventBinding.name.should.be.exactly("render");
			});

			describe("with chunk call back name set", () => {
				it("creates source wrapper with function name", () => {
					const source = eventBinding.handler.call(handlerContext, "modules()", {
						ids: 100,
					});
					source.should.be.instanceof(ConcatSource);
					source.source().should.be.exactly("Foo(100,modules())");
				});
			});

			describe("without chunk call back name set", () => {
				it("creates source wrapper with library name", () => {
					delete handlerContext.outputOptions.chunkCallbackName;
					const source = eventBinding.handler.call(handlerContext, "modules()", {
						ids: 100,
					});
					source.should.be.instanceof(ConcatSource);
					source.source().should.be.exactly("webpackChunkBar(100,modules())");
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
				eventBinding.name.should.be.exactly("hash");
			});

			it("updates hash object", () => {
				eventBinding.handler.call(handlerContext, hashMock);
				hashMock.update.callCount.should.be.exactly(4);
				sinon.assert.calledWith(hashMock.update, "webworker");
				sinon.assert.calledWith(hashMock.update, "3");
				sinon.assert.calledWith(hashMock.update, "Foo");
				sinon.assert.calledWith(hashMock.update, "Bar");
			});
		});
	});
});
