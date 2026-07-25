import path from "path";
import { fileURLToPath } from "url";
import { generateModuleTree } from "../../helpers/project.mjs";
import { createWatchRebuildBench } from "../../lib/webpack.mjs";

const caseDir = path.dirname(fileURLToPath(import.meta.url));
const generated = path.join(caseDir, "generated");
const entry = path.join(generated, "module-0.js");
const dependency = path.join(generated, "module-1.js");
const leaf = path.join(generated, "module-149.js");

export default {
	name: "e2e/rebuild",
	async setup() {
		await generateModuleTree({
			dir: generated,
			count: 150,
			format: "esm"
		});
	},
	benches: [
		createWatchRebuildBench({
			name: "development rebuild after entry change",
			caseDir,
			entryFile: entry,
			config: {
				mode: "development",
				entry
			}
		}),
		createWatchRebuildBench({
			name: "development rebuild after dependency change",
			caseDir,
			entryFile: dependency,
			config: {
				mode: "development",
				entry
			}
		}),
		createWatchRebuildBench({
			name: "development rebuild after leaf change",
			caseDir,
			entryFile: leaf,
			config: {
				mode: "development",
				entry
			}
		})
	]
};
