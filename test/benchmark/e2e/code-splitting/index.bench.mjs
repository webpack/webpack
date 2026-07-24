import path from "path";
import { fileURLToPath } from "url";
import { generateModuleTree } from "../../helpers/project.mjs";
import { defineSuite, prepareConfig, runBuild } from "../../lib/index.mjs";

const caseDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {string} */
let entry = "";

export default defineSuite({
	name: "e2e/code-splitting",
	async setup() {
		// Every 7th edge is a dynamic import → dozens of async chunks, which
		// exercises chunk graph building and splitChunks.
		entry = await generateModuleTree({
			dir: path.join(caseDir, "generated"),
			count: 200,
			format: "esm",
			dynamicEvery: 7
		});
	},
	benches: [
		{
			name: "development build",
			fn() {
				return runBuild(
					prepareConfig(caseDir, "development", {
						mode: "development",
						entry
					})
				);
			}
		},
		{
			name: "production build with splitChunks all",
			fn() {
				return runBuild(
					prepareConfig(caseDir, "production", {
						mode: "production",
						entry,
						optimization: {
							splitChunks: { chunks: "all", minSize: 1000 }
						}
					})
				);
			}
		}
	]
});
