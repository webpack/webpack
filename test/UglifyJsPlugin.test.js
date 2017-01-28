"use strict";
const should = require("should");
const sinon = require("sinon");
const UglifyJsPlugin = require("../lib/optimize/UglifyJsPlugin");
const PluginEnvironment = require("./helpers/PluginEnvironment");
const SourceMapSource = require("webpack-sources").SourceMapSource;
const RawSource = require("webpack-sources").RawSource;

describe("UglifyJsPlugin", function() {
	it("has apply function", function() {
		(new UglifyJsPlugin()).apply.should.be.a.Function();
	});

	describe("when applied with no options", function() {
		let eventBindings;
		let eventBinding;

		beforeEach(function() {
			const pluginEnvironment = new PluginEnvironment();
			const compilerEnv = pluginEnvironment.getEnvironmentStub();
			compilerEnv.context = "";

			const plugin = new UglifyJsPlugin();
			plugin.apply(compilerEnv);
			eventBindings = pluginEnvironment.getEventBindings();
		});

		it("binds one event handler", function() {
			eventBindings.length.should.be.exactly(1);
		});

		describe("compilation handler", function() {
			beforeEach(function() {
				eventBinding = eventBindings[0];
			});

			it("binds to compilation event", function() {
				eventBinding.name.should.be.exactly("compilation");
			});

			describe("when called", function() {
				let chunkPluginEnvironment;
				let compilationEventBindings;
				let compilationEventBinding;
				let compilation;
				let callback;

				beforeEach(function() {
					chunkPluginEnvironment = new PluginEnvironment();
					compilation = chunkPluginEnvironment.getEnvironmentStub();
					compilation.assets = {
						"test.js": {
							__UglifyJsPlugin: {}
						},
						"test1.js": "",
						"test2.js": {
							source: function() {
								return "invalid javascript";
							}
						},
						"test3.js": {
							source: function() {
								return "/** @preserve Foo Bar */ function foo(longVariableName) { longVariableName = 1; }";
							}
						}
					};
					compilation.errors = [];

					eventBinding.handler(compilation);
					compilationEventBindings = chunkPluginEnvironment.getEventBindings();
				});

				it("binds one event handler", function() {
					compilationEventBindings.length.should.be.exactly(1);
				});

				describe("optimize-chunk-assets handler", function() {
					beforeEach(function() {
						compilationEventBinding = compilationEventBindings[0];
					});

					it("binds to optimize-chunk-assets event", function() {
						compilationEventBinding.name.should.be.exactly("optimize-chunk-assets");
					});

					it("only calls callback once", function() {
						callback = sinon.spy();
						compilationEventBinding.handler([""], callback);
						callback.callCount.should.be.exactly(1);
					});

					it("default only parses filenames ending with .js", function() {
						compilationEventBinding.handler([{
							files: ["test", "test.js"]
						}], function() {
							Object.keys(compilation.assets).length.should.be.exactly(4);
						});
					});

					it("early returns if private property is already set", function() {
						compilationEventBinding.handler([{
							files: ["test.js"]
						}], function() {
							compilation.assets["test.js"].should.deepEqual({});
						});
					});

					it("outputs stack trace errors for invalid asset", function() {
						compilationEventBinding.handler([{
							files: ["test1.js"]
						}], function() {
							compilation.errors.length.should.be.exactly(1);
							compilation.errors[0].should.be.an.Error;
							compilation.errors[0].message.should.have.containEql("TypeError");
						});
					});

					it("outputs parsing errors for invalid javascript", function() {
						compilationEventBinding.handler([{
							files: ["test2.js"]
						}], function() {
							compilation.errors.length.should.be.exactly(1);
							compilation.errors[0].should.be.an.Error;
							compilation.errors[0].message.should.have.containEql("SyntaxError");
							compilation.errors[0].message.should.have.containEql("[test2.js:1,8]");
						});
					});

					it("outputs no errors for valid javascript", function() {
						compilationEventBinding.handler([{
							files: ["test3.js"]
						}], function() {
							compilation.errors.length.should.be.exactly(0);
						});
					});

					it("outputs RawSource for valid javascript", function() {
						compilationEventBinding.handler([{
							files: ["test3.js"]
						}], function() {
							compilation.assets["test3.js"].should.be.instanceof(RawSource);
						});
					});

					it("outputs mangled javascript", function() {
						compilationEventBinding.handler([{
							files: ["test3.js"]
						}], function() {
							compilation.assets["test3.js"]._value.should.not.containEql("longVariableName");
						});
					});

					it("compresses and does not output beautified javascript", function() {
						compilationEventBinding.handler([{
							files: ["test3.js"]
						}], function() {
							compilation.assets["test3.js"]._value.should.not.containEql("\n");
						});
					});

					it("preserves comments", function() {
						compilationEventBinding.handler([{
							files: ["test3.js"]
						}], function() {
							compilation.assets["test3.js"]._value.should.containEql("/**");
						});
					});
				});
			});
		});
	});

	describe("when applied with invalid options", function() {
		it("outputs uglify errors", function() {
			const pluginEnvironment = new PluginEnvironment();
			const compilerEnv = pluginEnvironment.getEnvironmentStub();
			compilerEnv.context = "";

			const plugin = new UglifyJsPlugin({
				output: {
					"invalid-option": true
				}
			});
			plugin.apply(compilerEnv);
			const eventBinding = pluginEnvironment.getEventBindings()[0];

			const chunkPluginEnvironment = new PluginEnvironment();
			const compilation = chunkPluginEnvironment.getEnvironmentStub();
			compilation.assets = {
				"test.js": {
					source: function() {
						return "var foo = 1;";
					}
				}
			};
			compilation.errors = [];

			eventBinding.handler(compilation);
			const compilationEventBinding = chunkPluginEnvironment.getEventBindings()[0];

			compilationEventBinding.handler([{
				files: ["test.js"]
			}], function() {
				compilation.errors.length.should.be.exactly(1);
				compilation.errors[0].message.should.have.containEql("supported option");
			});
		});
	});

	describe("when applied with all options", function() {
		let eventBindings;
		let eventBinding;

		beforeEach(function() {
			const pluginEnvironment = new PluginEnvironment();
			const compilerEnv = pluginEnvironment.getEnvironmentStub();
			compilerEnv.context = "";

			const plugin = new UglifyJsPlugin({
				sourceMap: true,
				compress: {
					warnings: true,
				},
				mangle: false,
				beautify: true,
				comments: false
			});
			plugin.apply(compilerEnv);
			eventBindings = pluginEnvironment.getEventBindings();
		});

		it("binds one event handler", function() {
			eventBindings.length.should.be.exactly(1);
		});

		describe("compilation handler", function() {
			beforeEach(function() {
				eventBinding = eventBindings[0];
			});

			it("binds to compilation event", function() {
				eventBinding.name.should.be.exactly("compilation");
			});

			describe("when called", function() {
				let chunkPluginEnvironment;
				let compilationEventBindings;
				let compilationEventBinding;
				let compilation;

				beforeEach(function() {
					chunkPluginEnvironment = new PluginEnvironment();
					compilation = chunkPluginEnvironment.getEnvironmentStub();
					compilation.assets = {
						"test.js": {
							source: function() {
								return "/** @preserve Foo Bar */ function foo(longVariableName) { longVariableName = 1; }";
							},
							map: function() {
								return {
									version: 3,
									sources: ["test.js"],
									names: ["foo", "longVariableName"],
									mappings: "AAAA,QAASA,KAAIC,kBACTA,iBAAmB"
								};
							}
						},
						"test1.js": {
							source: function() {
								return "invalid javascript";
							},
							map: function() {
								return {
									version: 3,
									sources: ["test1.js"],
									names: [""],
									mappings: "AAAA"
								};
							}
						},
						"test2.js": {
							source: function() {
								return "function foo(x) { if (x) { return bar(); not_called1(); } }";
							},
							map: function() {
								return {
									version: 3,
									sources: ["test1.js"],
									names: ["foo", "x", "bar", "not_called1"],
									mappings: "AAAA,QAASA,KAAIC,GACT,GAAIA,EAAG,CACH,MAAOC,MACPC"
								};
							}
						},
						"test3.js": {
							sourceAndMap: function() {
								return {
									source: "/** @preserve Foo Bar */ function foo(longVariableName) { longVariableName = 1; }",
									map: {
										version: 3,
										sources: ["test.js"],
										names: ["foo", "longVariableName"],
										mappings: "AAAA,QAASA,KAAIC,kBACTA,iBAAmB"
									}
								};
							},
						},
					};
					compilation.errors = [];
					compilation.warnings = [];

					eventBinding.handler(compilation);
					compilationEventBindings = chunkPluginEnvironment.getEventBindings();
				});

				it("binds two event handler", function() {
					compilationEventBindings.length.should.be.exactly(2);
				});

				describe("build-module handler", function() {
					beforeEach(function() {
						compilationEventBinding = compilationEventBindings[0];
					});

					it("binds to build-module event", function() {
						compilationEventBinding.name.should.be.exactly("build-module");
					});

					it("sets the useSourceMap flag", function() {
						const obj = {};
						compilationEventBinding.handler(obj);
						obj.useSourceMap.should.be.equal(true);
					});
				});

				describe("optimize-chunk-assets handler", function() {
					beforeEach(function() {
						compilationEventBinding = compilationEventBindings[1];
					});

					it("binds to optimize-chunk-assets event", function() {
						compilationEventBinding.name.should.be.exactly("optimize-chunk-assets");
					});

					it("outputs no errors for valid javascript", function() {
						compilationEventBinding.handler([{
							files: ["test.js"]
						}], function() {
							compilation.errors.length.should.be.exactly(0);
						});
					});

					it("outputs SourceMapSource for valid javascript", function() {
						compilationEventBinding.handler([{
							files: ["test.js"]
						}], function() {
							compilation.assets["test.js"].should.be.instanceof(SourceMapSource);
						});
					});

					it("does not output mangled javascript", function() {
						compilationEventBinding.handler([{
							files: ["test.js"]
						}], function() {
							compilation.assets["test.js"]._value.should.containEql("longVariableName");
						});
					});

					it("outputs beautified javascript", function() {
						compilationEventBinding.handler([{
							files: ["test.js"]
						}], function() {
							compilation.assets["test.js"]._value.should.containEql("\n");
						});
					});

					it("does not preserve comments", function() {
						compilationEventBinding.handler([{
							files: ["test.js"]
						}], function() {
							compilation.assets["test.js"]._value.should.not.containEql("/**");
						});
					});

					it("outputs parsing errors", function() {
						compilationEventBinding.handler([{
							files: ["test1.js"]
						}], function() {
							compilation.errors.length.should.be.exactly(1);
							compilation.errors[0].should.be.an.Error;
							compilation.errors[0].message.should.containEql("[test1.js:1,0][test1.js:1,8]");
						});
					});

					it("outputs warnings for unreachable code", function() {
						compilationEventBinding.handler([{
							files: ["test2.js"]
						}], function() {
							compilation.warnings.length.should.be.exactly(1);
							compilation.warnings[0].should.be.an.Error;
							compilation.warnings[0].message.should.containEql("Dropping unreachable code");
						});
					});

					it("works with sourceAndMap assets as well", function() {
						compilationEventBinding.handler([{
							files: ["test3.js"]
						}], function() {
							compilation.errors.length.should.be.exactly(0);
							compilation.assets["test3.js"].should.be.instanceof(SourceMapSource);
						});
					});
				});
			});
		});
	});
});
