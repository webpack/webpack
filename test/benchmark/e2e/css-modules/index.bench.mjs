import path from "path";
import { fileURLToPath } from "url";
import { generateCssProject } from "../../helpers/project.mjs";
import { createBuildScenarios } from "../../lib/webpack.mjs";

const caseDir = path.dirname(fileURLToPath(import.meta.url));
const generated = path.join(caseDir, "generated");
const entry = path.join(generated, "index.js");

export default {
	name: "e2e/css-modules",
	async setup() {
		await generateCssProject({
			dir: generated,
			count: 40,
			rulesPerFile: 30
		});
	},
	benches: createBuildScenarios({
		caseDir,
		entryFile: entry,
		config: {
			entry,
			target: "web",
			experiments: { css: true }
		}
	})
};
