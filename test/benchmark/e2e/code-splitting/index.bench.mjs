import path from "path";
import { generateModuleTree } from "../../helpers/project.mjs";
import { createBuildScenarios } from "../../lib/webpack.mjs";

const caseDir = import.meta.dirname;
const esmGenerated = path.join(caseDir, "generated", "esm");
const esmEntry = path.join(esmGenerated, "module-0.js");
const commonJsGenerated = path.join(caseDir, "generated", "commonjs");
const commonJsEntry = path.join(commonJsGenerated, "module-0.js");
const name = "e2e/code-splitting";

export default {
	name,
	iterations: 8,
	async setup() {
		// Every 7th edge is a dynamic import → dozens of async chunks, which
		// exercises chunk graph building and splitChunks.
		await Promise.all([
			generateModuleTree({
				dir: esmGenerated,
				count: 200,
				format: "esm",
				dynamicEvery: 7
			}),
			generateModuleTree({
				dir: commonJsGenerated,
				count: 200,
				format: "cjs",
				dynamicEvery: 7
			})
		]);
	},
	benches: [
		...createBuildScenarios({
			case: "esm",
			entryFile: esmEntry,
			config: { entry: esmEntry }
		}),
		...createBuildScenarios({
			case: "commonjs",
			entryFile: commonJsEntry,
			config: { entry: commonJsEntry }
		}),
		...createBuildScenarios({
			case: "esm/split-chunks-all",
			entryFile: esmEntry,
			config: {
				entry: esmEntry,
				optimization: {
					splitChunks: { chunks: "all", minSize: 1000 }
				}
			}
		}),
		...createBuildScenarios({
			case: "esm/split-chunks-max-size",
			entryFile: esmEntry,
			config: {
				entry: esmEntry,
				optimization: {
					splitChunks: {
						chunks: "all",
						minSize: 1000,
						maxSize: 20_000
					}
				}
			}
		}),
		...createBuildScenarios({
			case: "esm/single-runtime-chunk",
			entryFile: esmEntry,
			config: {
				entry: esmEntry,
				optimization: { runtimeChunk: "single" }
			}
		})
	]
};
