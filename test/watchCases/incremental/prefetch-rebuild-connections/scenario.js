"use strict";

const path = require("path");
const { AutomaticPrefetchPlugin } = require("../../../..");
const createWatchTestSession = require("../../../helpers/watchTestSession");

/** @import { ScenarioOptions } from "../../../helpers/watchTestSession" */

/**
 * @param {ScenarioOptions} options suite options
 * @returns {void}
 */
module.exports = (options) => {
	for (const mode of /** @type {const} */ (["development", "production"])) {
		it(`should detach connections replaced during prefetch in ${mode}`, async () => {
			const request = `${path.join(__dirname, "loader.js")}!./branch`;
			const session = createWatchTestSession(
				path.join(options.directory, mode),
				{
					mode,
					experiments: options.experiments,
					output: { pathinfo: false },
					cache: { type: mode === "development" ? "memory" : "filesystem" },
					optimization: {
						minimize: false,
						moduleIds: "named",
						chunkIds: "named"
					},
					plugins: [new AutomaticPrefetchPlugin()]
				}
			);
			try {
				session.write({
					"index.js": `module.exports = require(${JSON.stringify(request)});`,
					"branch.js": 'module.exports = require("./first");',
					"first.js": "module.exports = 1;",
					"second.js": "module.exports = 2;"
				});
				await session.compare(await session.start());
				expect(session.readExports()).toBe(1);
				for (const target of ["second", "first"]) {
					session.write({
						"branch.js": `module.exports = require("./${target}");`
					});
					const [stats] = await Promise.all([
						session.nextBuild(),
						session.invalidate()
					]);
					await session.compare(stats);
					expect(session.readExports()).toBe(target === "first" ? 1 : 2);
				}
			} finally {
				await session.close();
			}
		}, 30000);
	}
};
