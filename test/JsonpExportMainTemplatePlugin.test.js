"use strict";

const should = require("should");
const sinon = require("sinon");
const TemplatePluginEnvironment = require("./helpers/TemplatePluginEnvironment");
const ConcatSource = require("webpack-sources").ConcatSource;
const JsonpExportMainTemplatePlugin = require("../lib/JsonpExportMainTemplatePlugin");

describe("JsonpExportMainTemplatePlugin", () => {
	let env;

	const applyTemplatePluginWithOptions = function(Plugin, name) {
		const plugin = new Plugin(name);
		const templatePluginEnvironment = new TemplatePluginEnvironment();
		const environment = templatePluginEnvironment.getEnvironmentStub();
		environment.mainTemplate.applyPluginsWaterfall = () => "templateName";
		plugin.apply(environment);
		return templatePluginEnvironment;
	};

	beforeEach(() => env = {});

	it("has apply function", () => (new JsonpExportMainTemplatePlugin()).apply.should.be.a.Function());

	describe("when applied", () => {
		beforeEach(() =>
			env.templatePlugin = applyTemplatePluginWithOptions(JsonpExportMainTemplatePlugin, "foo"));

		describe("event handlers", () => {
			beforeEach(() => env.eventBindings = env.templatePlugin.getEventBindings());

			it("binds one handlers", () => env.eventBindings.length.should.be.exactly(1));

			describe("render-with-entry handler", () => {
				beforeEach(() => env.eventBinding = env.eventBindings[0]);

				it("binds to render-with-entry event", () =>
					env.eventBinding.name.should.be.exactly("render-with-entry"));

				it("creates source wrapper calling JSONP global callback", () => {
					const source = env.eventBinding.handler("moduleSource()", env.chunk, "bar");
					source.should.be.instanceof(ConcatSource);
					source.source().should.be.exactly("templateName(moduleSource());");
				});
			});
		});

		describe("main template event handlers", () => {
			beforeEach(() => env.mainTemplateBindings = env.templatePlugin.getMainTemplateBindings());

			it("binds two handlers", () => env.mainTemplateBindings.length.should.be.exactly(2));

			describe("global-hash-paths handler", () => {
				beforeEach(() => env.mainTemplateBinding = env.mainTemplateBindings[0]);

				it("binds to global-hash-paths event", () => env.mainTemplateBinding.name.should.be.exactly("global-hash-paths"));

				it("adds name to path array", () => env.mainTemplateBinding.handler([]).should.deepEqual(["foo"]));
			});

			describe("hash handler", () => {
				beforeEach(() => env.mainTemplateBinding = env.mainTemplateBindings[1]);

				it("binds to hash event", () => env.mainTemplateBinding.name.should.be.exactly("hash"));

				it("updates hash", () => {
					const hash = {
						update: sinon.spy()
					};
					env.mainTemplateBinding.handler(hash);

					hash.update.callCount.should.be.exactly(2);
					hash.update.firstCall.args[0].should.be.exactly("jsonp export");
					hash.update.secondCall.args[0].should.be.exactly("foo");
				});
			});
		});
	});
});
