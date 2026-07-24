import path from "path";
import { fileURLToPath } from "url";
import { generateModuleTree } from "../../helpers/project.mjs";
import { defineSuite, prepareConfig, runBuild } from "../../lib/index.mjs";

const caseDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {string} */
let entry = "";

export default defineSuite({
	name: "e2e/many-modules-esm",
	async setup() {
		entry = await generateModuleTree({
			dir: path.join(caseDir, "generated"),
			count: 250,
			format: "esm"
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
			name: "production build",
			fn() {
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
