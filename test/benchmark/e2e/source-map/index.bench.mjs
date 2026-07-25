import path from "path";
import { generateModuleTree } from "../../helpers/project.mjs";
import { createBuildScenarios } from "../../lib/webpack.mjs";

const caseDir = import.meta.dirname;
const generated = path.join(caseDir, "generated");
const entry = path.join(generated, "module-0.js");
const name = "e2e/source-map";

/**
 * @param {false | string} devtool devtool
 * @returns {ReturnType<typeof createBuildScenarios>} benchmarks
 */
const sourceMapScenarios = (devtool) =>
	createBuildScenarios({
		case: devtool === false ? "none" : devtool,
		entryFile: entry,
		config: { entry, devtool }
	});

export default {
	name,
	async setup() {
		await generateModuleTree({
			dir: generated,
			count: 150,
			format: "esm"
		});
	},
	benches: [
		...sourceMapScenarios(false),
		...sourceMapScenarios("eval"),
		...sourceMapScenarios("eval-source-map"),
		...sourceMapScenarios("eval-cheap-source-map"),
		...sourceMapScenarios("cheap-module-source-map"),
		...sourceMapScenarios("source-map"),
		...sourceMapScenarios("hidden-nosources-source-map")
	]
};
