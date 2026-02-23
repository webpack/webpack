"use strict";

const { RuntimeGlobals, RuntimeModule, Template } = require("../../../../");

class ReactRefreshRuntimeModule extends RuntimeModule {
	constructor() {
		super("react refresh", 5);
	}

	generate() {
		const { runtimeTemplate } = this.compilation;
		return Template.asString([
			`if (${RuntimeGlobals.interceptModuleExecution}) {`,
			Template.indent([
				`${
					RuntimeGlobals.interceptModuleExecution
				}.push(${runtimeTemplate.basicFunction("options", [
					"var originalFactory = options.factory;",
					`options.factory = ${runtimeTemplate.basicFunction(
						"moduleObject, moduleExports, webpackRequire",
						[
							"if (!originalFactory) {",
							Template.indent([
								'var e = new Error("Cannot find module");',
								"e.code = 'TEST'",
								"throw e"
							]),
							"}",
							Template.indent(
								"originalFactory.call(this, moduleObject, moduleExports, webpackRequire);"
							)
						]
					)}`
				])})`
			]),
			"}"
		]);
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	output: {
		pathinfo: true
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap(
					"ReactFreshWebpackPlugin",
					(compilation) => {
						compilation.hooks.additionalTreeRuntimeRequirements.tap(
							"ReactFreshWebpackPlugin",
							(chunk, set) => {
								set.add(RuntimeGlobals.interceptModuleExecution);
								compilation.addRuntimeModule(
									chunk,
									new ReactRefreshRuntimeModule()
								);
							}
						);
					}
				);
			}
		}
	]
};
