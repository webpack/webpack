import path from "path";
import { fileURLToPath } from "url";
import { generateModuleTree } from "../../helpers/project.mjs";
import {
	createBuildBench,
	createBuildScenarios
} from "../../lib/webpack.mjs";

const caseDir = path.dirname(fileURLToPath(import.meta.url));
const generated = path.join(caseDir, "generated");
const entry = path.join(generated, "module-0.js");

export default {
	name: "e2e/many-modules-esm",
	async setup() {
		await generateModuleTree({
			dir: generated,
			count: 250,
			format: "esm"
		});
	},
	benches: [
		...createBuildScenarios({
			caseDir,
			entryFile: entry,
			config: { entry }
		}),
		createBuildBench({
			name: "development build with module concatenation",
			caseDir,
			config: {
				mode: "development",
				entry,
				optimization: { concatenateModules: true }
			}
		}),
		createBuildBench({
			name: "production build without module concatenation",
			caseDir,
			config: {
				mode: "production",
				entry,
				optimization: { concatenateModules: false }
			}
		}),
		createBuildBench({
			name: "production build without minimization",
			caseDir,
			config: {
				mode: "production",
				entry,
				optimization: { minimize: false }
			}
		}),
		createBuildBench({
			name: "production build without concatenation or minimization",
			caseDir,
			config: {
				mode: "production",
				entry,
				optimization: { concatenateModules: false, minimize: false }
			}
		})
	]
};
