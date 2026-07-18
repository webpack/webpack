"use strict";

it("should keep equal values for process.env and import.meta.env on direct access when EnvironmentPlugins conflict", () => {
	expect(process.env.ENV_PLUGIN_CUSTOM).toBe(import.meta.env.ENV_PLUGIN_CUSTOM);
	expect(process.env.ENV_PLUGIN_CUSTOM).toBe("first");
});

it("should keep equal values for process.env and import.meta.env when destructured under EnvironmentPlugin conflicts", () => {
	const { ENV_PLUGIN_CUSTOM: fromProcess } = process.env;
	const { ENV_PLUGIN_CUSTOM: fromImportMeta } = import.meta.env;
	expect(fromProcess).toBe(fromImportMeta);
});

it("should keep equal built-in NODE_ENV values for process.env and import.meta.env under EnvironmentPlugin conflicts", () => {
	expect(process.env.NODE_ENV).toBe(import.meta.env.NODE_ENV);
	const { NODE_ENV: fromProcess } = process.env;
	const { NODE_ENV: fromImportMeta } = import.meta.env;
	expect(fromProcess).toBe(fromImportMeta);
	expect(fromProcess).toBe(process.env.NODE_ENV);
});
