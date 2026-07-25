import path from "path";
import { fileURLToPath } from "url";
import { generateModuleTree } from "../../helpers/project.mjs";
import {
	createBuildBench,
	createWatchRebuildBench
} from "../../lib/webpack.mjs";

const caseDir = path.dirname(fileURLToPath(import.meta.url));
const generated = path.join(caseDir, "generated");
const entry = path.join(generated, "module-0.js");

/**
 * @param {import("../../../..").Configuration["devtool"]} devtool devtool
 * @param {"development" | "production"=} mode mode
 * @returns {import("../../lib/suite.mjs").BenchmarkDefinition} benchmark
 */
const sourceMapBuild = (devtool, mode = "development") =>
	createBuildBench({
		name:
			devtool === false
				? `${mode} build without source maps`
				: `${mode} build with ${devtool}`,
		caseDir,
		config: { mode, entry, devtool }
	});

export default {
	name: "e2e/source-map",
	async setup() {
		await generateModuleTree({
			dir: generated,
			count: 150,
			format: "esm"
		});
	},
	benches: [
		sourceMapBuild(false),
		sourceMapBuild("eval"),
		sourceMapBuild("eval-source-map"),
		sourceMapBuild("eval-cheap-source-map"),
		sourceMapBuild("cheap-module-source-map"),
		sourceMapBuild("source-map"),
		sourceMapBuild("hidden-nosources-source-map", "production"),
		createWatchRebuildBench({
			name: "development rebuild with source-map",
			caseDir,
			entryFile: entry,
			config: { mode: "development", entry, devtool: "source-map" }
		})
	]
};
