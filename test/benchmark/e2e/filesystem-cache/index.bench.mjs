import path from "path";
import { fileURLToPath } from "url";
import { generateModuleTree } from "../../helpers/project.mjs";
import { defineSuite, prepareConfig, runBuild } from "../../lib/index.mjs";

const caseDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("../../../..").Configuration} */
let writeConfig = {};
/** @type {import("../../../..").Configuration} */
let readConfig = {};

export default defineSuite({
	name: "e2e/filesystem-cache",
	async setup() {
		const entry = await generateModuleTree({
			dir: path.join(caseDir, "generated"),
			count: 300,
			format: "esm"
		});
		writeConfig = prepareConfig(caseDir, "warm", {
			mode: "development",
			entry,
			cache: {
				type: "filesystem",
				compression: false
			}
		});
		readConfig = {
			...writeConfig,
			cache: {
				.../** @type {import("../../../..").FileCacheOptions} */ (
					writeConfig.cache
				),
				readonly: true
			}
		};
	},
	benches: [
		{
			name: "warm filesystem cache build",
			beforeAll() {
				return runBuild(writeConfig);
			},
			fn() {
				return runBuild(readConfig);
			}
		}
	]
});
