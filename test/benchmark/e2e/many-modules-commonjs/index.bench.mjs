import path from "path";
import { generateModuleTree } from "../../helpers/project.mjs";
import { createBuildScenarios } from "../../lib/webpack.mjs";

const caseDir = import.meta.dirname;
const generated = path.join(caseDir, "generated");
const entry = path.join(generated, "module-0.js");
const name = "e2e/many-modules-commonjs";

export default {
	name,
	iterations: 8,
	async setup() {
		await generateModuleTree({
			dir: generated,
			count: 250,
			format: "cjs"
		});
	},
	benches: [
		...createBuildScenarios({
			entryFile: entry,
			config: { entry }
		}),
		...createBuildScenarios({
			case: "node",
			entryFile: entry,
			config: { entry, target: "node" }
		}),
		...createBuildScenarios({
			case: "without-minimization",
			entryFile: entry,
			config: {
				entry,
				optimization: { minimize: false }
			}
		})
	]
};
