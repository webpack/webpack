import path from "path";
import { fileURLToPath } from "url";
import { generateAssetProject } from "../../helpers/project.mjs";
import {
	createBuildBench,
	createBuildScenarios
} from "../../lib/webpack.mjs";

const caseDir = path.dirname(fileURLToPath(import.meta.url));
const generated = path.join(caseDir, "generated");
const entry = path.join(generated, "index.js");

/**
 * @param {"asset" | "asset/bytes" | "asset/inline" | "asset/resource" | "asset/source"} type module type
 * @param {number=} maxSize automatic inline threshold
 * @returns {import("../../../..").Configuration} configuration
 */
const assetConfig = (type, maxSize) => ({
	entry,
	module: {
		rules: [
			{
				test: /\.bin$/,
				type,
				...(maxSize === undefined
					? {}
					: { parser: { dataUrlCondition: { maxSize } } })
			}
		]
	}
});

export default {
	name: "e2e/asset-modules",
	async setup() {
		await generateAssetProject({
			dir: generated,
			count: 150,
			size: (index) => (index % 2 === 0 ? 512 : 16_384)
		});
	},
	benches: [
		...createBuildScenarios({
			caseDir,
			entryFile: entry,
			namePrefix: "asset/resource",
			config: assetConfig("asset/resource")
		}),
		createBuildBench({
			name: "asset/inline development build",
			caseDir,
			config: { ...assetConfig("asset/inline"), mode: "development" }
		}),
		createBuildBench({
			name: "asset/source development build",
			caseDir,
			config: { ...assetConfig("asset/source"), mode: "development" }
		}),
		createBuildBench({
			name: "asset/bytes development build",
			caseDir,
			config: { ...assetConfig("asset/bytes"), mode: "development" }
		}),
		createBuildBench({
			name: "asset automatic mixed development build",
			caseDir,
			config: { ...assetConfig("asset", 8192), mode: "development" }
		}),
		createBuildBench({
			name: "asset automatic resource development build",
			caseDir,
			config: { ...assetConfig("asset", 256), mode: "development" }
		})
	]
};
