import path from "path";
import { fileURLToPath } from "url";
import { generateJsonProject } from "../../helpers/project.mjs";
import {
	createBuildBench,
	createBuildScenarios
} from "../../lib/webpack.mjs";

const caseDir = path.dirname(fileURLToPath(import.meta.url));
const generated = path.join(caseDir, "generated");
const entry = path.join(generated, "index.js");
const selectedEntry = path.join(generated, "selected.js");

export default {
	name: "e2e/json-modules",
	async setup() {
		await generateJsonProject({
			dir: generated,
			count: 60,
			entriesPerFile: 200
		});
	},
	benches: [
		...createBuildScenarios({
			caseDir,
			entryFile: entry,
			config: { entry }
		}),
		createBuildBench({
			name: "development build with deep export analysis",
			caseDir,
			config: {
				mode: "development",
				entry,
				module: { parser: { json: { exportsDepth: Infinity } } }
			}
		}),
		createBuildBench({
			name: "production build with selected exports",
			caseDir,
			config: { mode: "production", entry: selectedEntry }
		}),
		createBuildBench({
			name: "production build without JSON.parse generation",
			caseDir,
			config: {
				mode: "production",
				entry,
				module: { generator: { json: { JSONParse: false } } }
			}
		})
	]
};
