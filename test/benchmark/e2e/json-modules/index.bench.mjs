import path from "path";
import { generateJsonProject } from "../../helpers/project.mjs";
import { createBuildScenarios } from "../../lib/webpack.mjs";

const caseDir = import.meta.dirname;
const generated = path.join(caseDir, "generated");
const entry = path.join(generated, "index.js");
const selectedEntry = path.join(generated, "selected.js");
const name = "e2e/json-modules";

export default {
	name,
	async setup() {
		await generateJsonProject({
			dir: generated,
			count: 60,
			entriesPerFile: 200
		});
	},
	benches: [
		...createBuildScenarios({
			entryFile: entry,
			config: { entry }
		}),
		...createBuildScenarios({
			case: "deep-export-analysis",
			entryFile: entry,
			config: {
				entry,
				module: { parser: { json: { exportsDepth: Infinity } } }
			}
		}),
		...createBuildScenarios({
			case: "selected-exports",
			entryFile: selectedEntry,
			config: { entry: selectedEntry }
		}),
		...createBuildScenarios({
			case: "without-json-parse",
			entryFile: entry,
			config: {
				entry,
				module: { generator: { json: { JSONParse: false } } }
			}
		})
	]
};
