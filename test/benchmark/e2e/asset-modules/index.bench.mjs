import path from "path";
import { fileURLToPath } from "url";
import { generateAssetProject } from "../../helpers/project.mjs";
import { defineSuite, prepareConfig, runBuild } from "../../lib/index.mjs";

const caseDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {string} */
let entry = "";

export default defineSuite({
	name: "e2e/asset-modules",
	async setup() {
		entry = await generateAssetProject({
			dir: path.join(caseDir, "generated"),
			count: 150,
			size: 4096
		});
	},
	benches: [
		{
			name: "asset/resource development build",
			fn() {
				return runBuild(
					prepareConfig(caseDir, "resource", {
						mode: "development",
						entry,
						module: {
							rules: [{ test: /\.bin$/, type: "asset/resource" }]
						}
					})
				);
			}
		},
		{
			name: "asset/inline development build",
			fn() {
				return runBuild(
					prepareConfig(caseDir, "inline", {
						mode: "development",
						entry,
						module: {
							rules: [{ test: /\.bin$/, type: "asset/inline" }]
						}
					})
				);
			}
		}
	]
});
