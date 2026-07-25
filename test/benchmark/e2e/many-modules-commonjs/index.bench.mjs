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
	name: "e2e/many-modules-commonjs",
	async setup() {
		await generateModuleTree({
			dir: generated,
			count: 250,
			format: "cjs"
		});
	},
	benches: [
		...createBuildScenarios({
			caseDir,
			entryFile: entry,
			config: { entry }
		}),
		createBuildBench({
			name: "Node.js development build",
			caseDir,
			config: { mode: "development", entry, target: "node" }
		}),
		createBuildBench({
			name: "production build without minimization",
			caseDir,
			config: {
				mode: "production",
				entry,
				optimization: { minimize: false }
			}
		})
	]
};
