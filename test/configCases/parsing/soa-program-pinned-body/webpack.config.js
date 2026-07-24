"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		{
			/**
			 * @param {import("../../../../").Compiler} compiler compiler
			 */
			apply(compiler) {
				compiler.hooks.compilation.tap(
					"PinProgramBodyPlugin",
					(compilation, { normalModuleFactory }) => {
						for (const type of ["javascript/auto", "javascript/esm"]) {
							normalModuleFactory.hooks.parser
								.for(type)
								.tap(
									"PinProgramBodyPlugin",
									(/** @type {EXPECTED_ANY} */ parser) => {
										// materializes the Program body before every core tap, so
										// harmony detection, the directive probe and the walk all
										// take their pinned-body fallbacks
										parser.hooks.program.tap(
											{ name: "PinProgramBodyPlugin", stage: -1000 },
											(/** @type {EXPECTED_ANY} */ ast) => {
												if (ast.body.length === -1) {
													throw new Error("unreachable");
												}
											}
										);
									}
								);
						}
					}
				);
			}
		}
	]
};
