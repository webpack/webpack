"use strict";

const sinon = require("sinon");
const TemplatePluginEnvironment = require("./helpers/TemplatePluginEnvironment");
const ConcatSource = require("webpack-sources").ConcatSource;
const AmdMainTemplatePlugin = require("../lib/AmdMainTemplatePlugin");

describe("AmdMainTemplatePlugin", () => {
	let env;

	const applyTemplatePluginWithOptions = function(Plugin, name) {
		const plugin = new Plugin(name);
		const templatePluginEnvironment = new TemplatePluginEnvironment();
		const environment = templatePluginEnvironment.getEnvironmentStub();
		environment.mainTemplate.applyPluginsWaterfall = () => "templateName";
		plugin.apply(environment);
		return templatePluginEnvironment;
	};

	const setupPluginAndGetEventBinding = function(name) {
		const templatePlugin = applyTemplatePluginWithOptions(AmdMainTemplatePlugin, name);
		const eventBindings = templatePlugin.getEventBindings();
		return eventBindings[0];
	};

	beforeEach(() => {
		env = {
			modulesListWithExternals: [{
				id: "module-1",
				external: true,
				request: {
					amd: "external-amd-module"
				}
			}, {
				id: "module-2",
				external: true,
				request: "external-non-amd-module"
			}, {
				id: "module-3",
				external: true
			}, {
				id: "module-4",
				external: false
			}]
		};
	});

	it("has apply function", () => expect(new AmdMainTemplatePlugin().apply).toBeInstanceOf(Function));

	describe("when applied", () => {
		beforeEach(() =>
			env.templatePlugin = applyTemplatePluginWithOptions(AmdMainTemplatePlugin, "foo"));

		describe("event handlers", () => {
			beforeEach(() => env.eventBindings = env.templatePlugin.getEventBindings());

			it("binds one handlers", () => expect(env.eventBindings).toHaveLength(1));

			describe("render-with-entry handler", () => {
				beforeEach(() => env.eventBinding = env.eventBindings[0]);

				it("binds to render-with-entry event", () =>
					expect(env.eventBinding.name).toBe("render-with-entry"));

				describe("with name", () => {
					beforeEach(() => {
						env.chunk = {
							modules: env.modulesListWithExternals
						};
						env.eventBinding = setupPluginAndGetEventBinding("foo");
					});

					it("creates source wrapper with module name and external dependencies", () => {
						const source = env.eventBinding.handler("moduleSource()", env.chunk, "bar");
						expect(source).toBeInstanceOf(ConcatSource);
						expect(source.source()).toBe("define(\"templateName\", [\"external-amd-module\",\"external-non-amd-module\",null], function(__WEBPACK_EXTERNAL_MODULE_module_1__, __WEBPACK_EXTERNAL_MODULE_module_2__, __WEBPACK_EXTERNAL_MODULE_module_3__) { return moduleSource()});");
					});
				});

				describe("with external dependencies", () => {
					beforeEach(() => {
						env.chunk = {
							modules: env.modulesListWithExternals
						};
						env.eventBinding = setupPluginAndGetEventBinding();
					});

					it("creates source wrapper with external dependencies", () => {
						const source = env.eventBinding.handler("moduleSource()", env.chunk, "bar");
						expect(source).toBeInstanceOf(ConcatSource);
						expect(source.source()).toBe("define([\"external-amd-module\",\"external-non-amd-module\",null], function(__WEBPACK_EXTERNAL_MODULE_module_1__, __WEBPACK_EXTERNAL_MODULE_module_2__, __WEBPACK_EXTERNAL_MODULE_module_3__) { return moduleSource()});");
					});
				});

				describe("with only local dependencies", () => {
					beforeEach(() => {
						const externalFlag = {
							external: false
						};
						const noExternals = env.modulesListWithExternals.map((module) => Object.assign(module, externalFlag));
						env.chunk = {
							modules: noExternals
						};
						env.eventBinding = setupPluginAndGetEventBinding();
					});

					it("creates source wrapper with callback only", () => {
						const source = env.eventBinding.handler("moduleSource()", env.chunk, "bar");
						expect(source).toBeInstanceOf(ConcatSource);
						expect(source.source()).toBe("define(function() { return moduleSource()});");
					});
				});
			});
		});

		describe("main template event handlers", () => {
			beforeEach(() =>
				env.mainTemplateBindings = env.templatePlugin.getMainTemplateBindings());

			it("binds two handlers", () => expect(env.mainTemplateBindings).toHaveLength(2));

			describe("global-hash-paths handler", () => {
				beforeEach(() => env.mainTemplateBinding = env.mainTemplateBindings[0]);

				it("binds to global-hash-paths event", () =>
					expect(env.mainTemplateBinding.name).toBe("global-hash-paths"));

				it("adds name to path array", () =>
					expect(env.mainTemplateBinding.handler([])).toEqual(["foo"]));
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
					expect(hash.update.firstCall.args[0]).toBe("exports amd");
					expect(hash.update.secondCall.args[0]).toBe("foo");
				});
			});
		});
	});
});
