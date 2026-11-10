"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{},
	{
		plugins: [
			{
				apply(compiler) {
					compiler.hooks.compilation.tap(
						"Test",
						(compilation, { normalModuleFactory }) => {
							// a tap on the deprecated hook turns on the full pre-walk
							normalModuleFactory.hooks.parser
								.for("javascript/auto")
								.tap("Test", (parser) => {
									parser.hooks.preStatement.tap("Test", () => undefined);
								});
						}
					);
				}
			}
		]
	}
];
