var should = require("should");
var sinon = require("sinon");
var ConcatSource = require("webpack-sources").ConcatSource;
var JsonpHotUpdateChunkTemplatePlugin = require("../lib/JsonpHotUpdateChunkTemplatePlugin");
var applyPluginWithOptions = require("./helpers/applyPluginWithOptions");

describe("JsonpHotUpdateChunkTemplatePlugin", function() {
	var handlerContext;

	beforeEach(function() {
		handlerContext = {
			outputOptions: {
				hotUpdateFunction: "Foo",
				library: "Bar"
			}
		};
	});

	it("has apply function", function() {
		(new JsonpHotUpdateChunkTemplatePlugin()).apply.should.be.a.Function();
	});

	describe("when applied", function() {
		var eventBindings, eventBinding;

		beforeEach(function() {
			eventBindings = applyPluginWithOptions(JsonpHotUpdateChunkTemplatePlugin);
		});

		it("binds two event handlers", function() {
			eventBindings.length.should.be.exactly(2);
		});

		describe("render handler", function() {
			beforeEach(function() {
				eventBinding = eventBindings[0];
			});

			it("binds to render event", function() {
				eventBinding.name.should.be.exactly("render");
			});

			it("creates source wrapper with export", function() {
				var source = eventBinding.handler.call(handlerContext, "moduleSource()", [], [], {}, 100);
				source.should.be.instanceof(ConcatSource);
				source.source().should.be.exactly("Foo(100,moduleSource())");
			});
		});

		describe("hash handler", function() {
			var hashMock;

			beforeEach(function() {
				eventBinding = eventBindings[1];
				hashMock = {
					update: sinon.spy()
				};
			});

			it("binds to hash event", function() {
				eventBinding.name.should.be.exactly("hash");
			});

			it("updates hash object", function() {
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
