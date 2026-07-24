import path from "path";
import { fileURLToPath } from "url";
import { generateCssProject } from "../../helpers/project.mjs";
import { defineSuite, prepareConfig, runBuild } from "../../lib/index.mjs";

const caseDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {string} */
let entry = "";

export default defineSuite({
	name: "e2e/css-modules",
	async setup() {
		entry = await generateCssProject({
			dir: path.join(caseDir, "generated"),
			count: 40,
			rulesPerFile: 30
		});
	},
	benches: [
		{
			name: "development build",
			fn() {
				return runBuild(
					prepareConfig(caseDir, "development", {
						mode: "development",
						entry,
						target: "web",
						experiments: { css: true }
					})
				);
			}
		},
		{
			name: "production build",
			fn() {
				return runBuild(
					prepareConfig(caseDir, "production", {
						mode: "production",
						entry,
						target: "web",
						experiments: { css: true }
					})
				);
			}
		}
	]
});
