/* global describe, beforeEach, it */
"use strict";

const should = require("should");
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

	it("has apply function", () => new AmdMainTemplatePlugin().apply.should.be.a.Function());

	describe("when applied", () => {
		beforeEach(() =>
			env.templatePlugin = applyTemplatePluginWithOptions(AmdMainTemplatePlugin, "foo"));

		describe("event handlers", () => {
			beforeEach(() => env.eventBindings = env.templatePlugin.getEventBindings());

			it("binds one handlers", () => env.eventBindings.length.should.be.exactly(1));

			describe("render-with-entry handler", () => {
				beforeEach(() => env.eventBinding = env.eventBindings[0]);

				it("binds to render-with-entry event", () =>
					env.eventBinding.name.should.be.exactly("render-with-entry"));

				describe("with name", () => {
					beforeEach(() => {
						env.chunk = {
							getModules: () => env.modulesListWithExternals
						};
						env.eventBinding = setupPluginAndGetEventBinding("foo");
					});

					it("creates source wrapper with module name and external dependencies", () => {
						const source = env.eventBinding.handler("moduleSource()", env.chunk, "bar");
						source.should.be.instanceof(ConcatSource);
						source.source().should.be.exactly("define(\"templateName\", [\"external-amd-module\",\"external-non-amd-module\",null], function(__WEBPACK_EXTERNAL_MODULE_module_1__, __WEBPACK_EXTERNAL_MODULE_module_2__, __WEBPACK_EXTERNAL_MODULE_module_3__) { return moduleSource()});");
					});
				});

				describe("with external dependencies", () => {
					beforeEach(() => {
						env.chunk = {
							getModules: () => env.modulesListWithExternals
						};
						env.eventBinding = setupPluginAndGetEventBinding();
					});

					it("creates source wrapper with external dependencies", () => {
						const source = env.eventBinding.handler("moduleSource()", env.chunk, "bar");
						source.should.be.instanceof(ConcatSource);
						source.source().should.be.exactly("define([\"external-amd-module\",\"external-non-amd-module\",null], function(__WEBPACK_EXTERNAL_MODULE_module_1__, __WEBPACK_EXTERNAL_MODULE_module_2__, __WEBPACK_EXTERNAL_MODULE_module_3__) { return moduleSource()});");
					});
				});

				describe("with only local dependencies", () => {
					beforeEach(() => {
						const externalFlag = {
							external: false
						};
						const noExternals = env.modulesListWithExternals.map((module) => Object.assign(module, externalFlag));
						env.chunk = {
							getModules: () => env.modulesListWithExternals
						};
						env.eventBinding = setupPluginAndGetEventBinding();
					});

					it("creates source wrapper with callback only", () => {
						const source = env.eventBinding.handler("moduleSource()", env.chunk, "bar");
						source.should.be.instanceof(ConcatSource);
						source.source().should.be.exactly("define(function() { return moduleSource()});");
					});
				});
			});
		});

		describe("main template event handlers", () => {
			beforeEach(() =>
				env.mainTemplateBindings = env.templatePlugin.getMainTemplateBindings());

			it("binds two handlers", () => env.mainTemplateBindings.length.should.be.exactly(2));

			describe("global-hash-paths handler", () => {
				beforeEach(() => env.mainTemplateBinding = env.mainTemplateBindings[0]);

				it("binds to global-hash-paths event", () =>
					env.mainTemplateBinding.name.should.be.exactly("global-hash-paths"));

				it("adds name to path array", () =>
					env.mainTemplateBinding.handler([]).should.deepEqual(["foo"]));
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
					hash.update.firstCall.args[0].should.be.exactly("exports amd");
					hash.update.secondCall.args[0].should.be.exactly("foo");
				});
			});
		});
	});
});
