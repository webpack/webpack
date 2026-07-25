import path from "path";
import { fileURLToPath } from "url";
import { generateCssProject } from "../../helpers/project.mjs";
import { createBuildScenarios } from "../../lib/webpack.mjs";

const caseDir = path.dirname(fileURLToPath(import.meta.url));
const generated = path.join(caseDir, "generated");
const entry = path.join(generated, "index.js");
const name = "e2e/css-modules";

export default {
	name,
	iterations: 8,
	async setup() {
		await generateCssProject({
			dir: generated,
			count: 40,
			rulesPerFile: 30
		});
	},
	benches: createBuildScenarios({
		entryFile: entry,
		config: {
			entry,
			target: "web",
			experiments: { css: true }
		}
	})
};
