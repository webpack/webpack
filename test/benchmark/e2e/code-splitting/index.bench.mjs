import path from "path";
import { fileURLToPath } from "url";
import { generateModuleTree } from "../../helpers/project.mjs";
import {
	createBuildBench,
	createBuildScenarios
} from "../../lib/webpack.mjs";

const caseDir = path.dirname(fileURLToPath(import.meta.url));
const esmGenerated = path.join(caseDir, "generated", "esm");
const esmEntry = path.join(esmGenerated, "module-0.js");
const commonJsGenerated = path.join(caseDir, "generated", "commonjs");
const commonJsEntry = path.join(commonJsGenerated, "module-0.js");

export default {
	name: "e2e/code-splitting",
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
			caseDir,
			entryFile: esmEntry,
			namePrefix: "ESM",
			config: { entry: esmEntry }
		}),
		...createBuildScenarios({
			caseDir,
			entryFile: commonJsEntry,
			namePrefix: "CommonJS",
			config: { entry: commonJsEntry }
		}),
		createBuildBench({
			name: "production build with splitChunks all",
			caseDir,
			config: {
				mode: "production",
				entry: esmEntry,
				optimization: {
					splitChunks: { chunks: "all", minSize: 1000 }
				}
			}
		}),
		createBuildBench({
			name: "production build with splitChunks maxSize",
			caseDir,
			config: {
				mode: "production",
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
		createBuildBench({
			name: "development build with single runtime chunk",
			caseDir,
			config: {
				mode: "development",
				entry: esmEntry,
				optimization: { runtimeChunk: "single" }
			}
		})
	]
};
