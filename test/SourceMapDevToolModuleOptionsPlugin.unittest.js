"use strict";

const SourceMapDevToolModuleOptionsPlugin = require("../lib/SourceMapDevToolModuleOptionsPlugin");
const applyPluginWithOptions = require("./helpers/applyPluginWithOptions");

describe("SourceMapDevToolModuleOptionsPlugin", () => {
	describe("when applied", () => {
		let eventBindings;

		beforeEach(() => {
			eventBindings = undefined;
		});

		describe("with module false and line-to-line false", () => {
			beforeEach(() => {
				eventBindings = applyPluginWithOptions(
					SourceMapDevToolModuleOptionsPlugin,
					{
						module: false,
						lineToLine: false
					}
				);
			});

			it("does not bind any event handlers", () => {
				expect(eventBindings.length).toBe(0);
			});
		});

		describe("with module true", () => {
			beforeEach(() => {
				eventBindings = applyPluginWithOptions(
					SourceMapDevToolModuleOptionsPlugin,
					{
						module: true,
						lineToLine: false
					}
				);
			});

			it("binds one event handler", () => {
				expect(eventBindings.length).toBe(1);
			});

			describe("event handler", () => {
				it("binds to build-module event", () => {
					expect(eventBindings[0].name).toBe("build-module");
				});

				it("sets source map flag", () => {
					const module = {};
					eventBindings[0].handler(module);
					expect(module).toEqual({
						useSourceMap: true
					});
				});
			});
		});

		describe("with line-to-line true", () => {
			beforeEach(() =>
				(eventBindings = applyPluginWithOptions(
					SourceMapDevToolModuleOptionsPlugin,
					{
						module: false,
						lineToLine: true
					}
				)));

			it("binds one event handler", () => {
				expect(eventBindings.length).toBe(1);
			});

			describe("event handler", () => {
				it("binds to build-module event", () => {
					expect(eventBindings[0].name).toBe("build-module");
				});

				it("sets line-to-line flag", () => {
					const module = {};
					eventBindings[0].handler(module);
					expect(module).toEqual({
						lineToLine: true
					});
				});
			});
		});

		describe("with line-to-line object", () => {
			beforeEach(() => {
				eventBindings = applyPluginWithOptions(
					SourceMapDevToolModuleOptionsPlugin,
					{
						module: false,
						lineToLine: {}
					}
				);
			});

			it("binds one event handler", () => {
				expect(eventBindings.length).toBe(1);
			});

			describe("event handler", () => {
				it("binds to build-module event", () => {
					expect(eventBindings[0].name).toBe("build-module");
				});

				describe("when module has no resource", () => {
					it("makes no changes", () => {
						const module = {};
						eventBindings[0].handler(module);
						expect(module).toEqual({});
					});
				});

				describe("when module has a resource", () => {
					it("sets line-to-line flag", () => {
						const module = {
							resource: "foo"
						};
						eventBindings[0].handler(module);
						expect(module).toEqual({
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
						expect(module).toEqual({
							lineToLine: true,
							resource: "foo?bar"
						});
					});
				});
			});
		});
	});
});
