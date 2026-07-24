import path from "path";
import { fileURLToPath } from "url";
import { generateModuleTree } from "../../helpers/project.mjs";
import { defineSuite, prepareConfig, runBuild } from "../../lib/index.mjs";

const caseDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {string} */
let entry = "";

export default defineSuite({
	name: "e2e/source-map",
	async setup() {
		entry = await generateModuleTree({
			dir: path.join(caseDir, "generated"),
			count: 150,
			format: "esm"
		});
	},
	benches: [
		{
			name: "devtool source-map",
			fn() {
				return runBuild(
					prepareConfig(caseDir, "source-map", {
						mode: "development",
						entry,
						devtool: "source-map"
					})
				);
			}
		},
		{
			name: "devtool eval-source-map",
			fn() {
				return runBuild(
					prepareConfig(caseDir, "eval-source-map", {
						mode: "development",
						entry,
						devtool: "eval-source-map"
					})
				);
			}
		},
		{
			name: "devtool eval-cheap-source-map",
			fn() {
				return runBuild(
					prepareConfig(caseDir, "eval-cheap-source-map", {
						mode: "development",
						entry,
						devtool: "eval-cheap-source-map"
					})
				);
			}
		}
	]
});
