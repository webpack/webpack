import path from "path";
import { generateAssetProject } from "../../helpers/project.mjs";
import { createBuildScenarios } from "../../lib/webpack.mjs";

const caseDir = import.meta.dirname;
const generated = path.join(caseDir, "generated");
const entry = path.join(generated, "index.js");
const name = "e2e/asset-modules";

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
	name,
	async setup() {
		await generateAssetProject({
			dir: generated,
			count: 150,
			size: (index) => (index % 2 === 0 ? 512 : 16_384)
		});
	},
	benches: [
		...createBuildScenarios({
			case: "asset/resource",
			entryFile: entry,
			config: assetConfig("asset/resource")
		}),
		...createBuildScenarios({
			case: "asset/inline",
			entryFile: entry,
			config: assetConfig("asset/inline")
		}),
		...createBuildScenarios({
			case: "asset/source",
			entryFile: entry,
			config: assetConfig("asset/source")
		}),
		...createBuildScenarios({
			case: "asset/bytes",
			entryFile: entry,
			config: assetConfig("asset/bytes")
		}),
		...createBuildScenarios({
			case: "automatic-mixed",
			entryFile: entry,
			config: assetConfig("asset", 8192)
		}),
		...createBuildScenarios({
			case: "automatic-resource",
			entryFile: entry,
			config: assetConfig("asset", 256)
		})
	]
};
