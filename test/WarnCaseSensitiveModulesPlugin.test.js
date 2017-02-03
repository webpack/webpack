"use strict";

const should = require("should");
const sinon = require("sinon");
const PluginEnvironment = require("./helpers/PluginEnvironment");
const applyPluginWithOptions = require("./helpers/applyPluginWithOptions");
const WarnCaseSensitiveModulesPlugin = require("../lib/WarnCaseSensitiveModulesPlugin");

describe("WarnCaseSensitiveModulesPlugin", () => {
	let env;

	beforeEach(() => env = {});

	it("has apply function", () =>
		(new WarnCaseSensitiveModulesPlugin()).apply.should.be.a.Function());

	describe("when applied", () => {
		beforeEach(() => env.eventBindings = applyPluginWithOptions(WarnCaseSensitiveModulesPlugin));

		it("binds one event handler", () => env.eventBindings.length.should.be.exactly(1));

		describe("compilation handler", () => {
			beforeEach(() => {
				env.pluginEnvironment = new PluginEnvironment();
				env.eventBinding = env.eventBindings[0];
				env.eventBinding.handler(env.pluginEnvironment.getEnvironmentStub());
				env.compilationEventBindings = env.pluginEnvironment.getEventBindings();
			});

			it("binds to compilation event", () =>
				env.eventBinding.name.should.be.exactly("compilation"));

			it("binds one compilation event handler", () => env.compilationEventBindings.length.should.be.exactly(1));

			describe("seal handler", () => {
				beforeEach(() => {
					env.compilationEventContext = {
						modules: [{
								identifier: () => "Foo",
								reasons: []
							},
							{
								identifier: () => "Bar",
								reasons: []
							},
							{
								identifier: () => "fOO",
								reasons: []
							}
						],
						warnings: []
					};
					env.compilationEventBinding = env.compilationEventBindings[0];
					env.compilationEventBinding.handler.call(env.compilationEventContext);
				});

				it("binds to seal event", () => env.compilationEventBinding.name.should.be.exactly("seal"));

				it("adds warning for each plugin with case insensitive name", () => {
					env.compilationEventContext.warnings.length.should.be.exactly(1);
					env.compilationEventContext.warnings[0].message.should.be.exactly(`
There are multiple modules with names that only differ in casing.
This can lead to unexpected behavior when compiling on a filesystem with other case-semantic.
Use equal casing. Compare these module identifiers:
* Foo
* fOO
`.trim());
				});
			});
		});
	});
});
