var should = require("should");
var sinon = require("sinon");
var TemplatePluginEnvironment = require("./helpers/TemplatePluginEnvironment");
var ConcatSource = require("webpack-sources").ConcatSource;
var JsonpExportMainTemplatePlugin = require("../lib/JsonpExportMainTemplatePlugin");

describe("JsonpExportMainTemplatePlugin", function() {
	var env;

	var applyTemplatePluginWithOptions = function(Plugin, name) {
		var plugin = new Plugin(name);
		var templatePluginEnvironment = new TemplatePluginEnvironment();
		var environment = templatePluginEnvironment.getEnvironmentStub();
		environment.mainTemplate.applyPluginsWaterfall = () => "templateName";
		plugin.apply(environment);
		return templatePluginEnvironment
	};

	beforeEach(function() {
		env = {}
	});

	it("has apply function", function() {
		(new JsonpExportMainTemplatePlugin()).apply.should.be.a.Function();
	});

	describe("when applied", function() {
		beforeEach(function() {
			env.templatePlugin = applyTemplatePluginWithOptions(JsonpExportMainTemplatePlugin, "foo");
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

				it("creates source wrapper calling JSONP global callback", function() {
					var source = env.eventBinding.handler("moduleSource()", env.chunk, "bar");
					source.should.be.instanceof(ConcatSource);
					source.source().should.be.exactly('templateName(moduleSource());');
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
					hash.update.firstCall.args[0].should.be.exactly("jsonp export");
					hash.update.secondCall.args[0].should.be.exactly("foo");
				});
			});
		})
	});
});
