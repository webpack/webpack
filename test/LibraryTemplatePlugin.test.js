var should = require("should");
var sinon = require("sinon");
var LibraryTemplatePlugin = require("../lib/LibraryTemplatePlugin");
var applyPluginWithOptions = require("./helpers/applyPluginWithOptions");

describe("LibraryTemplatePlugin", function() {
	var env;

	beforeEach(function() {
		env = {
			compilation: sinon.spy()
		};
	});

	it("has apply function", function() {
		(new LibraryTemplatePlugin()).apply.should.be.a.Function();
	});

	describe("when applied", function() {
		beforeEach(function() {
			env.eventBindings = applyPluginWithOptions(LibraryTemplatePlugin);
		});

		it("binds two event handlers", function() {
			env.eventBindings.length.should.be.exactly(1);
		});

		describe("this-compilation handler", function() {
			beforeEach(function() {
				env.eventBinding = env.eventBindings[0];
			});

			describe("event handler", function() {
				it("binds to this-compilation event", function() {
					env.eventBinding.name.should.be.exactly("this-compilation");
				});
			});

			describe("when target is unknown", function() {
				beforeEach(function() {
					var unknownTarget = "unknownTarget";
					env.eventBindings = applyPluginWithOptions(LibraryTemplatePlugin, "foo", unknownTarget, "bar", "baz");
					env.eventBinding = env.eventBindings[0];
				});

				it("throws an error", function() {
					should(function() {
						env.eventBinding.handler(env.compilation);
					}).throw("unknownTarget is not a valid Library target");
				});
			});

			describe("name is a string", function() {
				[{
						type: "var",
						assertion: function(compilationContext) {
							compilationContext.varExpression.should.be.exactly("var foo");
							should(compilationContext.copyObject).be.undefined();
						}
					},
					{
						type: "assign",
						assertion: function(compilationContext) {
							compilationContext.varExpression.should.be.exactly("foo");
							should(compilationContext.copyObject).be.undefined();
						}
					},
					{
						type: "this",
						assertion: function(compilationContext) {
							compilationContext.varExpression.should.be.exactly('this["foo"]');
							should(compilationContext.copyObject).be.undefined();
						}
					},
					{
						type: "window",
						assertion: function(compilationContext) {
							compilationContext.varExpression.should.be.exactly('window["foo"]');
							should(compilationContext.copyObject).be.undefined();
						}
					},
					{
						type: "global",
						assertion: function(compilationContext) {
							compilationContext.varExpression.should.be.exactly('global["foo"]');
							should(compilationContext.copyObject).be.undefined();
						}
					},
					{
						type: "commonjs",
						assertion: function(compilationContext) {
							compilationContext.varExpression.should.be.exactly('exports["foo"]');
							should(compilationContext.copyObject).be.undefined();
						}
					},
					{
						type: "commonjs2",
						assertion: function(compilationContext) {
							compilationContext.varExpression.should.be.exactly("module.exports");
							should(compilationContext.copyObject).be.undefined();
						}
					},
					{
						type: "commonjs-module",
						assertion: function(compilationContext) {
							compilationContext.varExpression.should.be.exactly("module.exports");
							should(compilationContext.copyObject).be.undefined();
						}
					},
					{
						type: "amd",
						assertion: function(compilationContext) {
							compilationContext.name.should.be.exactly("foo");
						}
					},
					{
						type: "umd",
						assertion: function(compilationContext) {
							compilationContext.name.should.be.exactly("foo");
							compilationContext.optionalAmdExternalAsGlobal.should.be.false();
							compilationContext.namedDefine.should.be.exactly("bar");
							compilationContext.auxiliaryComment.should.be.exactly("baz");
						}
					},
					{
						type: "umd2",
						assertion: function(compilationContext) {
							compilationContext.name.should.be.exactly("foo");
							compilationContext.optionalAmdExternalAsGlobal.should.be.true();
							compilationContext.namedDefine.should.be.exactly("bar");
							compilationContext.auxiliaryComment.should.be.exactly("baz");
						}
					},
					{
						type: "jsonp",
						assertion: function(compilationContext) {
							compilationContext.name.should.be.exactly("foo");
						}
					}
				].forEach(function(targetTypeAndAssertion) {
					var type = targetTypeAndAssertion.type;

					describe("when target is " + type, function() {
						beforeEach(function() {
							env.eventBindings = applyPluginWithOptions(LibraryTemplatePlugin, "foo", type, "bar", "baz");
							env.eventBinding = env.eventBindings[0];
							env.eventBinding.handler(env.compilation);
						});

						it("compilation callback is called", function() {
							env.compilation.callCount.should.be.exactly(1);
						});

						it("compilation callback context is set up", function() {
							var compilationContext = env.compilation.firstCall.thisValue;
							targetTypeAndAssertion.assertion(compilationContext);
						});
					});
				});
			});

			describe("name is an array of strings", function() {
				[{
						type: "var",
						assertion: function(compilationContext) {
							compilationContext.varExpression.should.be.exactly('var foo = foo || {}; foo["bar"] = foo["bar"] || {}; foo["bar"]["baz"]');
							should(compilationContext.copyObject).be.undefined();
						}
					},
					{
						type: "assign",
						assertion: function(compilationContext) {
							compilationContext.varExpression.should.be.exactly('foo = typeof foo === "object" ? foo : {}; foo["bar"] = foo["bar"] || {}; foo["bar"]["baz"]');
							should(compilationContext.copyObject).be.undefined();
						}
					},
					{
						type: "this",
						assertion: function(compilationContext) {
							compilationContext.varExpression.should.be.exactly('this["foo"] = this["foo"] || {}; this["foo"]["bar"] = this["foo"]["bar"] || {}; this["foo"]["bar"]["baz"]');
							should(compilationContext.copyObject).be.undefined();
						}
					},
					{
						type: "window",
						assertion: function(compilationContext) {
							compilationContext.varExpression.should.be.exactly('window["foo"] = window["foo"] || {}; window["foo"]["bar"] = window["foo"]["bar"] || {}; window["foo"]["bar"]["baz"]');
							should(compilationContext.copyObject).be.undefined();
						}
					},
					{
						type: "global",
						assertion: function(compilationContext) {
							compilationContext.varExpression.should.be.exactly('global["foo"] = global["foo"] || {}; global["foo"]["bar"] = global["foo"]["bar"] || {}; global["foo"]["bar"]["baz"]');
							should(compilationContext.copyObject).be.undefined();
						}
					},
					{
						type: "commonjs",
						assertion: function(compilationContext) {
							compilationContext.varExpression.should.be.exactly('exports["foo"] = exports["foo"] || {}; exports["foo"]["bar"] = exports["foo"]["bar"] || {}; exports["foo"]["bar"]["baz"]');
							should(compilationContext.copyObject).be.undefined();
						}
					},
					{
						type: "commonjs2",
						assertion: function(compilationContext) {
							compilationContext.varExpression.should.be.exactly("module.exports");
							should(compilationContext.copyObject).be.undefined();
						}
					},
					{
						type: "commonjs-module",
						assertion: function(compilationContext) {
							compilationContext.varExpression.should.be.exactly("module.exports");
							should(compilationContext.copyObject).be.undefined();
						}
					},
					{
						type: "amd",
						assertion: function(compilationContext) {
							compilationContext.name.should.deepEqual(["foo", "bar", "baz"]);
						}
					},
					{
						type: "umd",
						assertion: function(compilationContext) {
							compilationContext.name.should.deepEqual(["foo", "bar", "baz"]);
							compilationContext.optionalAmdExternalAsGlobal.should.be.false();
							compilationContext.namedDefine.should.be.exactly("bar");
							compilationContext.auxiliaryComment.should.be.exactly("baz");
						}
					},
					{
						type: "umd2",
						assertion: function(compilationContext) {
							compilationContext.name.should.deepEqual(["foo", "bar", "baz"]);
							compilationContext.optionalAmdExternalAsGlobal.should.be.true();
							compilationContext.namedDefine.should.be.exactly("bar");
							compilationContext.auxiliaryComment.should.be.exactly("baz");
						}
					},
					{
						type: "jsonp",
						assertion: function(compilationContext) {
							compilationContext.name.should.deepEqual(["foo", "bar", "baz"]);
						}
					}
				].forEach(function(targetTypeAndAssertion) {
					var type = targetTypeAndAssertion.type;

					describe("when target is " + type, function() {
						beforeEach(function() {
							env.eventBindings = applyPluginWithOptions(LibraryTemplatePlugin, ["foo", "bar", "baz"], type, "bar", "baz");
							env.eventBinding = env.eventBindings[0];
							env.eventBinding.handler(env.compilation);
						});

						it("compilation callback is called", function() {
							env.compilation.callCount.should.be.exactly(1);
						});

						it("compilation callback context is set up", function() {
							var compilationContext = env.compilation.firstCall.thisValue;
							targetTypeAndAssertion.assertion(compilationContext);
						});
					});
				});
			});

			describe("name not provided", function() {
				[{
						type: "this",
						assertion: function(compilationContext) {
							compilationContext.varExpression.should.be.exactly("this");
							should(compilationContext.copyObject).be.true();
						}
					},
					{
						type: "window",
						assertion: function(compilationContext) {
							compilationContext.varExpression.should.be.exactly("window");
							should(compilationContext.copyObject).be.true();
						}
					},
					{
						type: "global",
						assertion: function(compilationContext) {
							compilationContext.varExpression.should.be.exactly("global");
							should(compilationContext.copyObject).be.true();
						}
					},
					{
						type: "commonjs",
						assertion: function(compilationContext) {
							compilationContext.varExpression.should.be.exactly("exports");
							should(compilationContext.copyObject).be.true();
						}
					}
				].forEach(function(targetTypeAndAssertion) {
					var type = targetTypeAndAssertion.type;

					describe("when target is " + type, function() {
						beforeEach(function() {
							env.eventBindings = applyPluginWithOptions(LibraryTemplatePlugin, undefined, type, "bar", "baz");
							env.eventBinding = env.eventBindings[0];
							env.eventBinding.handler(env.compilation);
						});

						it("compilation callback is called", function() {
							env.compilation.callCount.should.be.exactly(1);
						});

						it("compilation callback context is set up", function() {
							var compilationContext = env.compilation.firstCall.thisValue;
							targetTypeAndAssertion.assertion(compilationContext);
						});
					});
				});
			});
		});
	});
});
