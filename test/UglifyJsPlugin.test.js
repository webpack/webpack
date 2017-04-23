"use strict";

const sinon = require("sinon");
const UglifyJsPlugin = require("../lib/optimize/UglifyJsPlugin");
const PluginEnvironment = require("./helpers/PluginEnvironment");
const SourceMapSource = require("webpack-sources").SourceMapSource;
const RawSource = require("webpack-sources").RawSource;

describe("UglifyJsPlugin", function() {
	it("has apply function", function() {
		expect((new UglifyJsPlugin()).apply).toBeInstanceOf(Function);
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
			expect(eventBindings.length).toBe(1);
		});

		describe("compilation handler", function() {
			beforeEach(function() {
				eventBinding = eventBindings[0];
			});

			it("binds to compilation event", function() {
				expect(eventBinding.name).toBe("compilation");
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
					expect(compilationEventBindings.length).toBe(1);
				});

				describe("optimize-chunk-assets handler", function() {
					beforeEach(function() {
						compilationEventBinding = compilationEventBindings[0];
					});

					it("binds to optimize-chunk-assets event", function() {
						expect(compilationEventBinding.name).toBe("optimize-chunk-assets");
					});

					it("only calls callback once", function() {
						callback = sinon.spy();
						compilationEventBinding.handler([""], callback);
						expect(callback.callCount).toBe(1);
					});

					it("default only parses filenames ending with .js", function() {
						compilationEventBinding.handler([{
							files: ["test", "test.js"]
						}], function() {
							expect(Object.keys(compilation.assets).length).toBe(4);
						});
					});

					it("early returns if private property is already set", function() {
						compilationEventBinding.handler([{
							files: ["test.js"]
						}], function() {
							expect(compilation.assets["test.js"]).toEqual({});
						});
					});

					it("outputs stack trace errors for invalid asset", function() {
						compilationEventBinding.handler([{
							files: ["test1.js"]
						}], function() {
							expect(compilation.errors.length).toBe(1);
							expect(compilation.errors[0]).toBeInstanceOf(Error);
							expect(compilation.errors[0].message).toContain("TypeError");
						});
					});

					it("outputs parsing errors for invalid javascript", function() {
						compilationEventBinding.handler([{
							files: ["test2.js"]
						}], function() {
							expect(compilation.errors.length).toBe(1);
							expect(compilation.errors[0]).toBeInstanceOf(Error);
							expect(compilation.errors[0].message).toContain("Unexpected token");
							expect(compilation.errors[0].message).toContain("[test2.js:1,8]");
						});
					});

					it("outputs no errors for valid javascript", function() {
						compilationEventBinding.handler([{
							files: ["test3.js"]
						}], function() {
							expect(compilation.errors.length).toBe(0);
						});
					});

					it("outputs RawSource for valid javascript", function() {
						compilationEventBinding.handler([{
							files: ["test3.js"]
						}], function() {
							expect(compilation.assets["test3.js"]).toBeInstanceOf(RawSource);
						});
					});

					it("outputs mangled javascript", function() {
						compilationEventBinding.handler([{
							files: ["test3.js"]
						}], function() {
							expect(compilation.assets["test3.js"]._value).not.toContain("longVariableName");
						});
					});

					it("compresses and does not output beautified javascript", function() {
						compilationEventBinding.handler([{
							files: ["test3.js"]
						}], function() {
							expect(compilation.assets["test3.js"]._value).not.toContain("\n");
						});
					});

					it("preserves comments", function() {
						compilationEventBinding.handler([{
							files: ["test3.js"]
						}], function() {
							expect(compilation.assets["test3.js"]._value).toContain("/**");
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
				expect(compilation.errors.length).toBe(1);
				expect(compilation.errors[0].message).toContain("supported option");
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
				comments: false,
				extractComments: {
					condition: 'should be extracted',
					filename: function(file) {
						return file.replace(/(\.\w+)$/, '.license$1');
					},
					banner: function(licenseFile) {
						return 'License information can be found in ' + licenseFile;
					}
				}
			});
			plugin.apply(compilerEnv);
			eventBindings = pluginEnvironment.getEventBindings();
		});

		it("binds one event handler", function() {
			expect(eventBindings.length).toBe(1);
		});

		describe("compilation handler", function() {
			beforeEach(function() {
				eventBinding = eventBindings[0];
			});

			it("binds to compilation event", function() {
				expect(eventBinding.name).toBe("compilation");
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
						"test4.js": {
							source: function() {
								return "/*! this comment should be extracted */ function foo(longVariableName) { /* this will not be extracted */ longVariableName = 1; } // another comment that should be extracted to a separate file\n function foo2(bar) { return bar; }";
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
					};
					compilation.errors = [];
					compilation.warnings = [];

					eventBinding.handler(compilation);
					compilationEventBindings = chunkPluginEnvironment.getEventBindings();
				});

				it("binds two event handler", function() {
					expect(compilationEventBindings.length).toBe(2);
				});

				describe("build-module handler", function() {
					beforeEach(function() {
						compilationEventBinding = compilationEventBindings[0];
					});

					it("binds to build-module event", function() {
						expect(compilationEventBinding.name).toBe("build-module");
					});

					it("sets the useSourceMap flag", function() {
						const obj = {};
						compilationEventBinding.handler(obj);
						expect(obj.useSourceMap).toBe(true);
					});
				});

				describe("optimize-chunk-assets handler", function() {
					beforeEach(function() {
						compilationEventBinding = compilationEventBindings[1];
					});

					it("binds to optimize-chunk-assets event", function() {
						expect(compilationEventBinding.name).toBe("optimize-chunk-assets");
					});

					it("outputs no errors for valid javascript", function() {
						compilationEventBinding.handler([{
							files: ["test.js"]
						}], function() {
							expect(compilation.errors.length).toBe(0);
						});
					});

					it("outputs SourceMapSource for valid javascript", function() {
						compilationEventBinding.handler([{
							files: ["test.js"]
						}], function() {
							expect(compilation.assets["test.js"]).toBeInstanceOf(SourceMapSource);
						});
					});

					it("does not output mangled javascript", function() {
						compilationEventBinding.handler([{
							files: ["test.js"]
						}], function() {
							expect(compilation.assets["test.js"]._value).toContain("longVariableName");
						});
					});

					it("outputs beautified javascript", function() {
						compilationEventBinding.handler([{
							files: ["test.js"]
						}], function() {
							expect(compilation.assets["test.js"]._value).toContain("\n");
						});
					});

					it("does not preserve comments", function() {
						compilationEventBinding.handler([{
							files: ["test.js"]
						}], function() {
							expect(compilation.assets["test.js"]._value).not.toContain("/**");
						});
					});

					it("outputs parsing errors", function() {
						compilationEventBinding.handler([{
							files: ["test1.js"]
						}], function() {
							expect(compilation.errors.length).toBe(1);
							expect(compilation.errors[0]).toBeInstanceOf(Error);
							expect(compilation.errors[0].message).toContain("[test1.js:1,0][test1.js:1,8]");
						});
					});

					it("outputs warnings for unreachable code", function() {
						compilationEventBinding.handler([{
							files: ["test2.js"]
						}], function() {
							expect(compilation.warnings.length).toBe(1);
							expect(compilation.warnings[0]).toBeInstanceOf(Error);
							expect(compilation.warnings[0].message).toContain("Dropping unreachable code");
						});
					});

					it("works with sourceAndMap assets as well", function() {
						compilationEventBinding.handler([{
							files: ["test3.js"]
						}], function() {
							expect(compilation.errors.length).toBe(0);
							expect(compilation.assets["test3.js"]).toBeInstanceOf(SourceMapSource);
						});
					});

					describe("with warningsFilter set", function() {
						let compilationEventBindings, compilation;

						describe("and the filter returns true", function() {
							beforeEach(function() {
								const pluginEnvironment = new PluginEnvironment();
								const compilerEnv = pluginEnvironment.getEnvironmentStub();
								compilerEnv.context = "";

								const plugin = new UglifyJsPlugin({
									warningsFilter: function() {
										return true;
									},
									sourceMap: true,
									compress: {
										warnings: true,
									},
									mangle: false,
									beautify: true,
									comments: false
								});
								plugin.apply(compilerEnv);
								const eventBindings = pluginEnvironment.getEventBindings();

								const chunkPluginEnvironment = new PluginEnvironment();
								compilation = chunkPluginEnvironment.getEnvironmentStub();
								compilation.assets = {
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
								};
								compilation.errors = [];
								compilation.warnings = [];

								eventBindings[0].handler(compilation);
								compilationEventBindings = chunkPluginEnvironment.getEventBindings();
							});

							it("should get all warnings", function() {
								compilationEventBindings[1].handler([{
									files: ["test2.js"]
								}], function() {
									expect(compilation.warnings.length).toBe(1);
									expect(compilation.warnings[0]).toBeInstanceOf(Error);
									expect(compilation.warnings[0].message).toContain("Dropping unreachable code");
								});
							});
						});

						describe("and the filter returns false", function() {
							beforeEach(function() {
								const pluginEnvironment = new PluginEnvironment();
								const compilerEnv = pluginEnvironment.getEnvironmentStub();
								compilerEnv.context = "";

								const plugin = new UglifyJsPlugin({
									warningsFilter: function() {
										return false;
									},
									sourceMap: true,
									compress: {
										warnings: true,
									},
									mangle: false,
									beautify: true,
									comments: false
								});
								plugin.apply(compilerEnv);
								const eventBindings = pluginEnvironment.getEventBindings();

								const chunkPluginEnvironment = new PluginEnvironment();
								compilation = chunkPluginEnvironment.getEnvironmentStub();
								compilation.assets = {
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
								};
								compilation.errors = [];
								compilation.warnings = [];

								eventBindings[0].handler(compilation);
								compilationEventBindings = chunkPluginEnvironment.getEventBindings();
							});

							it("should get no warnings", function() {
								compilationEventBindings[1].handler([{
									files: ["test2.js"]
								}], function() {
									expect(compilation.warnings.length).toBe(0);
								});
							});
						});
					});

					it("extracts license information to separate file", function() {
						compilationEventBinding.handler([{
							files: ["test4.js"]
						}], function() {
							expect(compilation.errors.length).toBe(0);
							expect(compilation.assets["test4.license.js"]._value).toContain("/*! this comment should be extracted */");
							expect(compilation.assets["test4.license.js"]._value).toContain("// another comment that should be extracted to a separate file");
							expect(compilation.assets["test4.license.js"]._value).not.toContain("/* this will not be extracted */");
						});
					});
				});
			});
		});
	});

	describe("when applied with extract option set to a single file", function() {
		let eventBindings;
		let eventBinding;

		beforeEach(function() {
			const pluginEnvironment = new PluginEnvironment();
			const compilerEnv = pluginEnvironment.getEnvironmentStub();
			compilerEnv.context = "";

			const plugin = new UglifyJsPlugin({
				comments: "all",
				extractComments: {
					condition: /.*/,
					filename: "extracted-comments.js"
				}
			});
			plugin.apply(compilerEnv);
			eventBindings = pluginEnvironment.getEventBindings();
		});

		it("binds one event handler", function() {
			expect(eventBindings.length).toBe(1);
		});

		describe("compilation handler", function() {
			beforeEach(function() {
				eventBinding = eventBindings[0];
			});

			it("binds to compilation event", function() {
				expect(eventBinding.name).toBe("compilation");
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
								return "/* This is a comment from test.js */ function foo(bar) { return bar; }";
							}
						},
						"test2.js": {
							source: function() {
								return "// This is a comment from test2.js\nfunction foo2(bar) { return bar; }";
							}
						},
						"test3.js": {
							source: function() {
								return "/* This is a comment from test3.js */ function foo3(bar) { return bar; }\n// This is another comment from test3.js\nfunction foobar3(baz) { return baz; }";
							}
						},
					};
					compilation.errors = [];
					compilation.warnings = [];

					eventBinding.handler(compilation);
					compilationEventBindings = chunkPluginEnvironment.getEventBindings();
				});

				it("binds one event handler", function() {
					expect(compilationEventBindings.length).toBe(1);
				});

				describe("optimize-chunk-assets handler", function() {
					beforeEach(function() {
						compilationEventBinding = compilationEventBindings[0];
					});

					it("preserves comments", function() {
						compilationEventBinding.handler([{
							files: ["test.js", "test2.js", "test3.js"]
						}], function() {
							expect(compilation.assets["test.js"].source()).toContain("/*");
							expect(compilation.assets["test2.js"].source()).toContain("//");
							expect(compilation.assets["test3.js"].source()).toContain("/*");
							expect(compilation.assets["test3.js"].source()).toContain("//");
						});
					});

					it("extracts comments to specified file", function() {
						compilationEventBinding.handler([{
							files: ["test.js", "test2.js", "test3.js"]
						}], function() {
							expect(compilation.errors.length).toBe(0);
							expect(compilation.assets["extracted-comments.js"].source()).toContain("/* This is a comment from test.js */");
							expect(compilation.assets["extracted-comments.js"].source()).toContain("// This is a comment from test2.js");
							expect(compilation.assets["extracted-comments.js"].source()).toContain("/* This is a comment from test3.js */");
							expect(compilation.assets["extracted-comments.js"].source()).toContain("// This is another comment from test3.js");
							expect(compilation.assets["extracted-comments.js"].source()).not.toContain("function");
						});
					});
				});
			});
		});
	});
});
