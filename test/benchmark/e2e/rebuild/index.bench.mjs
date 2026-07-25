import path from "path";
import { generateModuleTree } from "../../helpers/project.mjs";
import { createWatchRebuildBench } from "../../lib/webpack.mjs";

const caseDir = import.meta.dirname;
const generated = path.join(caseDir, "generated");
const entry = path.join(generated, "module-0.js");
const dependency = path.join(generated, "module-1.js");
const leaf = path.join(generated, "module-149.js");
const name = "e2e/rebuild";

export default {
	name,
	iterations: 8,
	async setup() {
		await generateModuleTree({
			dir: generated,
			count: 150,
			format: "esm"
		});
	},
	benches: [
		createWatchRebuildBench({
			case: "entry-change",
			entryFile: entry,
			config: {
				mode: "development",
				entry
			}
		}),
		createWatchRebuildBench({
			case: "dependency-change",
			entryFile: dependency,
			config: {
				mode: "development",
				entry
			}
		}),
		createWatchRebuildBench({
			case: "leaf-change",
			entryFile: leaf,
			config: {
				mode: "development",
				entry
			}
		})
	]
};
