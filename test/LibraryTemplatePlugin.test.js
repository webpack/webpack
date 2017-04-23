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
		expect((new LibraryTemplatePlugin()).apply).toBeInstanceOf(Function);
	});

	describe("when applied", function() {
		beforeEach(function() {
			env.eventBindings = applyPluginWithOptions(LibraryTemplatePlugin);
		});

		it("binds two event handlers", function() {
			expect(env.eventBindings.length).toBe(1);
		});

		describe("this-compilation handler", function() {
			beforeEach(function() {
				env.eventBinding = env.eventBindings[0];
			});

			describe("event handler", function() {
				it("binds to this-compilation event", function() {
					expect(env.eventBinding.name).toBe("this-compilation");
				});
			});

			describe("when target is unknown", function() {
				beforeEach(function() {
					var unknownTarget = "unknownTarget";
					env.eventBindings = applyPluginWithOptions(LibraryTemplatePlugin, "foo", unknownTarget, "bar", "baz");
					env.eventBinding = env.eventBindings[0];
				});

				it("throws an error", function() {
					expect(function() {
						env.eventBinding.handler(env.compilation);
					}).toThrow("unknownTarget is not a valid Library target");
				});
			});

			describe("name is a string", function() {
				[{
						type: "var",
						assertion: function(compilationContext) {
							expect(compilationContext.varExpression).toBe("var foo");
							expect(compilationContext.copyObject).toBeUndefined();
						}
					},
					{
						type: "assign",
						assertion: function(compilationContext) {
							expect(compilationContext.varExpression).toBe("foo");
							expect(compilationContext.copyObject).toBeUndefined();
						}
					},
					{
						type: "this",
						assertion: function(compilationContext) {
							expect(compilationContext.varExpression).toBe('this["foo"]');
							expect(compilationContext.copyObject).toBeUndefined();
						}
					},
					{
						type: "window",
						assertion: function(compilationContext) {
							expect(compilationContext.varExpression).toBe('window["foo"]');
							expect(compilationContext.copyObject).toBeUndefined();
						}
					},
					{
						type: "global",
						assertion: function(compilationContext) {
							expect(compilationContext.varExpression).toBe('global["foo"]');
							expect(compilationContext.copyObject).toBeUndefined();
						}
					},
					{
						type: "commonjs",
						assertion: function(compilationContext) {
							expect(compilationContext.varExpression).toBe('exports["foo"]');
							expect(compilationContext.copyObject).toBeUndefined();
						}
					},
					{
						type: "commonjs2",
						assertion: function(compilationContext) {
							expect(compilationContext.varExpression).toBe("module.exports");
							expect(compilationContext.copyObject).toBeUndefined();
						}
					},
					{
						type: "commonjs-module",
						assertion: function(compilationContext) {
							expect(compilationContext.varExpression).toBe("module.exports");
							expect(compilationContext.copyObject).toBeUndefined();
						}
					},
					{
						type: "amd",
						assertion: function(compilationContext) {
							expect(compilationContext.name).toBe("foo");
						}
					},
					{
						type: "umd",
						assertion: function(compilationContext) {
							expect(compilationContext.name).toBe("foo");
							expect(compilationContext.optionalAmdExternalAsGlobal).toBeFalsy();
							expect(compilationContext.namedDefine).toBe("bar");
							expect(compilationContext.auxiliaryComment).toBe("baz");
						}
					},
					{
						type: "umd2",
						assertion: function(compilationContext) {
							expect(compilationContext.name).toBe("foo");
							expect(compilationContext.optionalAmdExternalAsGlobal).toBeTruthy();
							expect(compilationContext.namedDefine).toBe("bar");
							expect(compilationContext.auxiliaryComment).toBe("baz");
						}
					},
					{
						type: "jsonp",
						assertion: function(compilationContext) {
							expect(compilationContext.name).toBe("foo");
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
							expect(env.compilation.callCount).toBe(1);
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
							expect(compilationContext.varExpression).toBe('var foo = foo || {}; foo["bar"] = foo["bar"] || {}; foo["bar"]["baz"]');
							expect(compilationContext.copyObject).toBeUndefined();
						}
					},
					{
						type: "assign",
						assertion: function(compilationContext) {
							expect(compilationContext.varExpression).toBe('foo = typeof foo === "object" ? foo : {}; foo["bar"] = foo["bar"] || {}; foo["bar"]["baz"]');
							expect(compilationContext.copyObject).toBeUndefined();
						}
					},
					{
						type: "this",
						assertion: function(compilationContext) {
							expect(compilationContext.varExpression).toBe('this["foo"] = this["foo"] || {}; this["foo"]["bar"] = this["foo"]["bar"] || {}; this["foo"]["bar"]["baz"]');
							expect(compilationContext.copyObject).toBeUndefined();
						}
					},
					{
						type: "window",
						assertion: function(compilationContext) {
							expect(compilationContext.varExpression).toBe('window["foo"] = window["foo"] || {}; window["foo"]["bar"] = window["foo"]["bar"] || {}; window["foo"]["bar"]["baz"]');
							expect(compilationContext.copyObject).toBeUndefined();
						}
					},
					{
						type: "global",
						assertion: function(compilationContext) {
							expect(compilationContext.varExpression).toBe('global["foo"] = global["foo"] || {}; global["foo"]["bar"] = global["foo"]["bar"] || {}; global["foo"]["bar"]["baz"]');
							expect(compilationContext.copyObject).toBeUndefined();
						}
					},
					{
						type: "commonjs",
						assertion: function(compilationContext) {
							expect(compilationContext.varExpression).toBe('exports["foo"] = exports["foo"] || {}; exports["foo"]["bar"] = exports["foo"]["bar"] || {}; exports["foo"]["bar"]["baz"]');
							expect(compilationContext.copyObject).toBeUndefined();
						}
					},
					{
						type: "commonjs2",
						assertion: function(compilationContext) {
							expect(compilationContext.varExpression).toBe("module.exports");
							expect(compilationContext.copyObject).toBeUndefined();
						}
					},
					{
						type: "commonjs-module",
						assertion: function(compilationContext) {
							expect(compilationContext.varExpression).toBe("module.exports");
							expect(compilationContext.copyObject).toBeUndefined();
						}
					},
					{
						type: "amd",
						assertion: function(compilationContext) {
							expect(compilationContext.name).toEqual(["foo", "bar", "baz"]);
						}
					},
					{
						type: "umd",
						assertion: function(compilationContext) {
							expect(compilationContext.name).toEqual(["foo", "bar", "baz"]);
							expect(compilationContext.optionalAmdExternalAsGlobal).toBeFalsy();
							expect(compilationContext.namedDefine).toBe("bar");
							expect(compilationContext.auxiliaryComment).toBe("baz");
						}
					},
					{
						type: "umd2",
						assertion: function(compilationContext) {
							expect(compilationContext.name).toEqual(["foo", "bar", "baz"]);
							expect(compilationContext.optionalAmdExternalAsGlobal).toBeTruthy();
							expect(compilationContext.namedDefine).toBe("bar");
							expect(compilationContext.auxiliaryComment).toBe("baz");
						}
					},
					{
						type: "jsonp",
						assertion: function(compilationContext) {
							expect(compilationContext.name).toEqual(["foo", "bar", "baz"]);
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
							expect(env.compilation.callCount).toBe(1);
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
							expect(compilationContext.varExpression).toBe("this");
							expect(compilationContext.copyObject).toBeTruthy();
						}
					},
					{
						type: "window",
						assertion: function(compilationContext) {
							expect(compilationContext.varExpression).toBe("window");
							expect(compilationContext.copyObject).toBeTruthy();
						}
					},
					{
						type: "global",
						assertion: function(compilationContext) {
							expect(compilationContext.varExpression).toBe("global");
							expect(compilationContext.copyObject).toBeTruthy();
						}
					},
					{
						type: "commonjs",
						assertion: function(compilationContext) {
							expect(compilationContext.varExpression).toBe("exports");
							expect(compilationContext.copyObject).toBeTruthy();
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
							expect(env.compilation.callCount).toBe(1);
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
