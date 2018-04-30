"use strict";

require("should");
const SourceMapDevToolModuleOptionsPlugin = require("../lib/SourceMapDevToolModuleOptionsPlugin");
const applyPluginWithOptions = require("./helpers/applyPluginWithOptions");

describe("SourceMapDevToolModuleOptionsPlugin", () => {
	describe("when applied", () => {
		let eventBindings;

		beforeEach(() => (eventBindings = undefined));

		describe("with module false and line-to-line false", () => {
			beforeEach(
				() =>
					(eventBindings = applyPluginWithOptions(
						SourceMapDevToolModuleOptionsPlugin,
						{
							module: false,
							lineToLine: false
						}
					))
			);

			it("does not bind any event handlers", () =>
				eventBindings.length.should.be.exactly(0));
		});

		describe("with module true", () => {
			beforeEach(
				() =>
					(eventBindings = applyPluginWithOptions(
						SourceMapDevToolModuleOptionsPlugin,
						{
							module: true,
							lineToLine: false
						}
					))
			);

			it("binds one event handler", () =>
				eventBindings.length.should.be.exactly(1));

			describe("event handler", () => {
				it("binds to build-module event", () =>
					eventBindings[0].name.should.be.exactly("build-module"));

				it("sets source map flag", () => {
					const module = {};
					eventBindings[0].handler(module);
					module.should.deepEqual({
						useSourceMap: true
					});
				});
			});
		});

		describe("with line-to-line true", () => {
			beforeEach(
				() =>
					(eventBindings = applyPluginWithOptions(
						SourceMapDevToolModuleOptionsPlugin,
						{
							module: false,
							lineToLine: true
						}
					))
			);

			it("binds one event handler", () =>
				eventBindings.length.should.be.exactly(1));

			describe("event handler", () => {
				it("binds to build-module event", () =>
					eventBindings[0].name.should.be.exactly("build-module"));

				it("sets line-to-line flag", () => {
					const module = {};
					eventBindings[0].handler(module);
					module.should.deepEqual({
						lineToLine: true
					});
				});
			});
		});

		describe("with line-to-line object", () => {
			beforeEach(
				() =>
					(eventBindings = applyPluginWithOptions(
						SourceMapDevToolModuleOptionsPlugin,
						{
							module: false,
							lineToLine: {}
						}
					))
			);

			it("binds one event handler", () =>
				eventBindings.length.should.be.exactly(1));

			describe("event handler", () => {
				it("binds to build-module event", () =>
					eventBindings[0].name.should.be.exactly("build-module"));

				describe("when module has no resource", () => {
					it("makes no changes", () => {
						const module = {};
						eventBindings[0].handler(module);
						module.should.deepEqual({});
					});
				});

				describe("when module has a resource", () => {
					it("sets line-to-line flag", () => {
						const module = {
							resource: "foo"
						};
						eventBindings[0].handler(module);
						module.should.deepEqual({
							lineToLine: true,
							resource: "foo"
						});
					});
				});

				describe("when module has a resource with query", () => {
					it("sets line-to-line flag", () => {
						const module = {
							resource: "foo?bar"
						};
						eventBindings[0].handler(module);
						module.should.deepEqual({
							lineToLine: true,
							resource: "foo?bar"
						});
					});
				});
			});
		});
	});
});
