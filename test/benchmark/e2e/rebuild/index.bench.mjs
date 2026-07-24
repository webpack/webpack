import path from "path";
import { fileURLToPath } from "url";
import { generateModuleTree } from "../../helpers/project.mjs";
import { createWatchRebuildBench, defineSuite } from "../../lib/index.mjs";

const caseDir = path.dirname(fileURLToPath(import.meta.url));
const generated = path.join(caseDir, "generated");
const entry = path.join(generated, "module-0.js");

export default defineSuite({
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
			name: "incremental rebuild after entry change",
			caseDir,
			entryFile: entry,
			config: {
				mode: "development",
				entry
			}
		})
	]
});
