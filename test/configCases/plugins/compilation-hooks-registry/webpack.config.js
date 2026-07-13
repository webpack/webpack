"use strict";

const { Compilation, DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.thisCompilation.tap(
					"CompilationHooksRegistryTest",
					(compilation) => {
						const hooks = DefinePlugin.getCompilationHooks(compilation);
						expect(DefinePlugin.getCompilationHooks(compilation)).toBe(hooks);

						// a compilation from another webpack copy fails instanceof but is accepted by class name
						const ForeignCompilation = class Compilation {};
						const foreign =
							/** @type {Compilation} */
							(/** @type {unknown} */ (new ForeignCompilation()));
						expect(foreign).not.toBeInstanceOf(Compilation);
						expect(() =>
							DefinePlugin.getCompilationHooks(foreign)
						).not.toThrow();

						for (const value of /** @type {Compilation[]} */ (
							/** @type {unknown[]} */ ([
								null,
								{ hooks: {} },
								Object.create(null)
							])
						)) {
							expect(() => DefinePlugin.getCompilationHooks(value)).toThrow(
								"The 'compilation' argument must be an instance of Compilation"
							);
						}
					}
				);
			}
		}
	]
};
