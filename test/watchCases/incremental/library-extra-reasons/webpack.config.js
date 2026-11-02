"use strict";

const path = require("path");

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "development",
	entry: { main: "./index.js", other: "./other.js" },
	output: { filename: "[name].js", library: { type: "commonjs2" } },
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("CheckLibraryReasons", (compilation) => {
				compilation.hooks.finishModules.tap(
					{ name: "CheckLibraryReasons", stage: Infinity },
					(modules) => {
						for (const module of modules) {
							if (
								module.is("normal") &&
								/** @type {import("webpack").NormalModule} */ (module)
									.resource === path.join(compiler.context, "index.js")
							) {
								compilation.moduleGraph.addExtraReason(
									module,
									"test library reason"
								);
								const connections = [
									...compilation.moduleGraph.getIncomingConnections(module)
								];
								expect(
									connections
										.filter((connection) => connection.dependency === null)
										.map((connection) => connection.explanation)
										.sort()
								).toEqual(["test library reason", "used as library export"]);
								expect(
									connections.filter(
										(connection) => connection.dependency !== null
									)
								).toHaveLength(2);
							}
						}
					}
				);
			});
		}
	]
};
