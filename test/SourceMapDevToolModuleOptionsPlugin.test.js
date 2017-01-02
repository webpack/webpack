var should = require("should");
var SourceMapDevToolModuleOptionsPlugin = require("../lib/SourceMapDevToolModuleOptionsPlugin");
var applyPluginWithOptions = require('./helpers/applyPluginWithOptions');

describe("SourceMapDevToolModuleOptionsPlugin", function() {
	it("has apply function", function() {
		(new SourceMapDevToolModuleOptionsPlugin()).apply.should.be.a.Function();
	});

	describe("when applied", function() {
		var eventBindings;

		beforeEach(function() {
			eventBindings = undefined;
		});

		describe("with module false and line-to-line false", function() {
			beforeEach(function() {
				eventBindings = applyPluginWithOptions(SourceMapDevToolModuleOptionsPlugin, {
					module: false,
					lineToLine: false
				});
			});

			it("does not bind any event handlers", function() {
				eventBindings.length.should.be.exactly(0);
			});
		});

		describe("with module true", function() {
			beforeEach(function() {
				eventBindings = applyPluginWithOptions(SourceMapDevToolModuleOptionsPlugin, {
					module: true,
					lineToLine: false
				});
			});

			it("binds one event handler", function() {
				eventBindings.length.should.be.exactly(1);
			});

			describe("event handler", function() {
				it("binds to build-module event", function() {
					eventBindings[0].name.should.be.exactly("build-module");
				});

				it("sets source map flag", function() {
					var module = {};
					eventBindings[0].handler(module);
					module.should.deepEqual({
						useSourceMap: true
					});
				});
			});
		});

		describe("with line-to-line true", function() {
			beforeEach(function() {
				eventBindings = applyPluginWithOptions(SourceMapDevToolModuleOptionsPlugin, {
					module: false,
					lineToLine: true
				});
			});

			it("binds one event handler", function() {
				eventBindings.length.should.be.exactly(1);
			});

			describe("event handler", function() {
				it("binds to build-module event", function() {
					eventBindings[0].name.should.be.exactly("build-module");
				});

				it("sets line-to-line flag", function() {
					var module = {};
					eventBindings[0].handler(module);
					module.should.deepEqual({
						lineToLine: true
					});
				});
			});
		});

		describe("with line-to-line object", function() {
			beforeEach(function() {
				eventBindings = applyPluginWithOptions(SourceMapDevToolModuleOptionsPlugin, {
					module: false,
					lineToLine: {}
				});
			});

			it("binds one event handler", function() {
				eventBindings.length.should.be.exactly(1);
			});

			describe("event handler", function() {
				it("binds to build-module event", function() {
					eventBindings[0].name.should.be.exactly("build-module");
				});

				describe("when module has no resource", function() {
					it("makes no changes", function() {
						var module = {};
						eventBindings[0].handler(module);
						module.should.deepEqual({});
					});
				});

				describe("when module has a resource", function() {
					it("sets line-to-line flag", function() {
						var module = {
							resource: "foo"
						};
						eventBindings[0].handler(module);
						module.should.deepEqual({
							lineToLine: true,
							resource: "foo"
						});
					});
				});

				describe("when module has a resource with query", function() {
					it("sets line-to-line flag", function() {
						var module = {
							resource: "foo?bar"
						};
						eventBindings[0].handler(module);
						module.should.deepEqual({
							lineToLine: true,
							resource: "foo?bar"
						});
					});
				});
			});
		});
	});
});
