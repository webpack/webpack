var should = require("should");
var sinon = require("sinon");
var TemplatePluginEnvironment = require("./helpers/TemplatePluginEnvironment");
var ConcatSource = require("webpack-sources").ConcatSource;
var AmdMainTemplatePlugin = require("../lib/AmdMainTemplatePlugin");

describe("AmdMainTemplatePlugin", function() {
	var env;

	var applyTemplatePluginWithOptions = function(Plugin, name) {
		var plugin = new Plugin(name);
		var templatePluginEnvironment = new TemplatePluginEnvironment();
		var environment = templatePluginEnvironment.getEnvironmentStub();
		environment.mainTemplate.applyPluginsWaterfall = () => "templateName";
		plugin.apply(environment);
		return templatePluginEnvironment
	};

	var setupPluginAndGetEventBinding = function(name) {
		var templatePlugin = applyTemplatePluginWithOptions(AmdMainTemplatePlugin, name);
		var eventBindings = templatePlugin.getEventBindings();
		return eventBindings[0];
	};

	beforeEach(function() {
		env = {
			modulesListWithExternals: [{
					id: "module-1",
					external: true,
					request: {
						amd: "external-amd-module"
					}
				},
				{
					id: "module-2",
					external: true,
					request: "external-non-amd-module"
				},
				{
					id: "module-3",
					external: true
				},
				{
					id: "module-4",
					external: false
				}
			]
		};
	});

	it("has apply function", function() {
		(new AmdMainTemplatePlugin()).apply.should.be.a.Function();
	});

	describe("when applied", function() {
		beforeEach(function() {
			env.templatePlugin = applyTemplatePluginWithOptions(AmdMainTemplatePlugin, "foo");
		});

		describe("event handlers", function() {
			beforeEach(function() {
				env.eventBindings = env.templatePlugin.getEventBindings();
			});

			it("binds one handlers", function() {
				env.eventBindings.length.should.be.exactly(1);
			});

			describe("render-with-entry handler", function() {
				beforeEach(function() {
					env.eventBinding = env.eventBindings[0];
				});

				it("binds to render-with-entry event", function() {
					env.eventBinding.name.should.be.exactly("render-with-entry");
				});

				describe("with name", function() {
					beforeEach(function() {
						env.chunk = {
							modules: env.modulesListWithExternals
						};
						env.eventBinding = setupPluginAndGetEventBinding("foo");
					});

					it("creates source wrapper with module name and external dependencies", function() {
						var source = env.eventBinding.handler("moduleSource()", env.chunk, "bar");
						source.should.be.instanceof(ConcatSource);
						source.source().should.be.exactly('define("templateName", ["external-amd-module","external-non-amd-module",null], function(__WEBPACK_EXTERNAL_MODULE_module-1__, __WEBPACK_EXTERNAL_MODULE_module-2__, __WEBPACK_EXTERNAL_MODULE_module-3__) { return moduleSource()});');
					});
				});

				describe("with external dependencies", function() {
					beforeEach(function() {
						env.chunk = {
							modules: env.modulesListWithExternals
						};
						env.eventBinding = setupPluginAndGetEventBinding();
					});

					it("creates source wrapper with external dependencies", function() {
						var source = env.eventBinding.handler("moduleSource()", env.chunk, "bar");
						source.should.be.instanceof(ConcatSource);
						source.source().should.be.exactly('define(["external-amd-module","external-non-amd-module",null], function(__WEBPACK_EXTERNAL_MODULE_module-1__, __WEBPACK_EXTERNAL_MODULE_module-2__, __WEBPACK_EXTERNAL_MODULE_module-3__) { return moduleSource()});');
					});
				});

				describe("with only local dependencies", function() {
					beforeEach(function() {
						var externalFlag = {
							external: false
						};
						var noExternals = env.modulesListWithExternals.map((module) => Object.assign(module, externalFlag));
						env.chunk = {
							modules: noExternals
						};
						env.eventBinding = setupPluginAndGetEventBinding();
					});

					it("creates source wrapper with callback only", function() {
						var source = env.eventBinding.handler("moduleSource()", env.chunk, "bar");
						source.should.be.instanceof(ConcatSource);
						source.source().should.be.exactly('define(function() { return moduleSource()});');
					});
				});
			});
		});

		describe("main template event handlers", function() {
			beforeEach(function() {
				env.mainTemplateBindings = env.templatePlugin.getMainTemplateBindings();
			});

			it("binds two handlers", function() {
				env.mainTemplateBindings.length.should.be.exactly(2);
			});

			describe("global-hash-paths handler", function() {
				beforeEach(function() {
					env.mainTemplateBinding = env.mainTemplateBindings[0];
				});

				it("binds to global-hash-paths event", function() {
					env.mainTemplateBinding.name.should.be.exactly("global-hash-paths");
				});

				it("adds name to path array", function() {
					env.mainTemplateBinding.handler([]).should.deepEqual(["foo"]);
				});
			});

			describe("hash handler", function() {
				beforeEach(function() {
					env.mainTemplateBinding = env.mainTemplateBindings[1];
				});

				it("binds to hash event", function() {
					env.mainTemplateBinding.name.should.be.exactly("hash");
				});

				it("updates hash", function() {
					var hash = {
						update: sinon.spy()
					};
					env.mainTemplateBinding.handler(hash);

					hash.update.callCount.should.be.exactly(2);
					hash.update.firstCall.args[0].should.be.exactly("exports amd");
					hash.update.secondCall.args[0].should.be.exactly("foo");
				});
			});
		})
	});
});
