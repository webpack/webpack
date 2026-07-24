import path from "path";
import { fileURLToPath } from "url";
import { generateJsonProject } from "../../helpers/project.mjs";
import { defineSuite, prepareConfig, runBuild } from "../../lib/index.mjs";

const caseDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {string} */
let entry = "";

export default defineSuite({
	name: "e2e/json-modules",
	async setup() {
		entry = await generateJsonProject({
			dir: path.join(caseDir, "generated"),
			count: 60,
			entriesPerFile: 200
		});
	},
	benches: [
		{
			name: "development build",
			fn() {
				return runBuild(
					prepareConfig(caseDir, "development", {
						mode: "development",
						entry
					})
				);
			}
		},
		{
			name: "production build with tree shaking",
			fn() {
				// Production exercises JSON export analysis and mangling.
				return runBuild(
					prepareConfig(caseDir, "production", {
						mode: "production",
						entry
					})
				);
			}
		}
	]
});
