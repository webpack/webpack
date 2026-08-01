import path from "path";
import { generateModuleTree } from "../../helpers/project.mjs";
import { createBuildScenarios } from "../../lib/webpack.mjs";

const caseDir = import.meta.dirname;
const generated = path.join(caseDir, "generated");
const entry = path.join(generated, "module-0.js");
const name = "e2e/many-modules-esm";

export default {
	name,
	iterations: 8,
	async setup() {
		await generateModuleTree({
			dir: generated,
			count: 250,
			format: "esm"
		});
	},
	benches: [
		...createBuildScenarios({
			entryFile: entry,
			config: { entry }
		}),
		...createBuildScenarios({
			case: "with-module-concatenation",
			entryFile: entry,
			config: {
				entry,
				optimization: { concatenateModules: true }
			}
		}),
		...createBuildScenarios({
			case: "without-module-concatenation",
			entryFile: entry,
			config: {
				entry,
				optimization: { concatenateModules: false }
			}
		}),
		...createBuildScenarios({
			case: "without-minimization",
			entryFile: entry,
			config: {
				entry,
				optimization: { minimize: false }
			}
		}),
		...createBuildScenarios({
			case: "without-concatenation-or-minimization",
			entryFile: entry,
			config: {
				entry,
				optimization: { concatenateModules: false, minimize: false }
			}
		})
	]
};
