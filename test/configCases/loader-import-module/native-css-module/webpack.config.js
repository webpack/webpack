"use strict";

/** @type {import("../../../../").Configuration[]} */
const configurations = [];
for (const type of ["css/module", "css/auto"]) {
	for (const exportsOnly of [true, false]) {
		configurations.push({
			experiments: { css: true },
			module: {
				rules: [
					{ test: /index\.js$/, loader: "./loader.js" },
					{
						test: /\.module\.css$/,
						type,
						generator: { exportsOnly, localIdentName: "[local]" }
					}
				]
			}
		});
	}
}

module.exports = configurations;
