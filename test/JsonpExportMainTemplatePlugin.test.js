"use strict";

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

	it("has apply function", () => expect((new JsonpExportMainTemplatePlugin()).apply).toBeInstanceOf(Function));

	describe("when applied", () => {
		beforeEach(() =>
			env.templatePlugin = applyTemplatePluginWithOptions(JsonpExportMainTemplatePlugin, "foo"));

		describe("event handlers", () => {
			beforeEach(() => env.eventBindings = env.templatePlugin.getEventBindings());

			it("binds one handlers", () => expect(env.eventBindings.length).toBe(1));

			describe("render-with-entry handler", () => {
				beforeEach(() => env.eventBinding = env.eventBindings[0]);

				it("binds to render-with-entry event", () =>
					expect(env.eventBinding.name).toBe("render-with-entry"));

				it("creates source wrapper calling JSONP global callback", () => {
					const source = env.eventBinding.handler("moduleSource()", env.chunk, "bar");
					expect(source).toBeInstanceOf(ConcatSource);
					expect(source.source()).toBe("templateName(moduleSource());");
				});
			});
		});

		describe("main template event handlers", () => {
			beforeEach(() => env.mainTemplateBindings = env.templatePlugin.getMainTemplateBindings());

			it("binds two handlers", () => expect(env.mainTemplateBindings.length).toBe(2));

			describe("global-hash-paths handler", () => {
				beforeEach(() => env.mainTemplateBinding = env.mainTemplateBindings[0]);

				it("binds to global-hash-paths event", () => expect(env.mainTemplateBinding.name).toBe("global-hash-paths"));

				it("adds name to path array", () => expect(env.mainTemplateBinding.handler([])).toEqual(["foo"]));
			});

			describe("hash handler", () => {
				beforeEach(() => env.mainTemplateBinding = env.mainTemplateBindings[1]);

				it("binds to hash event", () => expect(env.mainTemplateBinding.name).toBe("hash"));

				it("updates hash", () => {
					const hash = {
						update: sinon.spy()
					};
					env.mainTemplateBinding.handler(hash);

					expect(hash.update.callCount).toBe(2);
					expect(hash.update.firstCall.args[0]).toBe("jsonp export");
					expect(hash.update.secondCall.args[0]).toBe("foo");
				});
			});
		});
	});
});
