const path = require("path");
const fs = require("fs");
const {
	Compilation,
	sources: { RawSource }
} = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		library: {
			type: "module"
		}
	},
	target: ["web", "es2020"],
	experiments: {
		outputModule: true
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("html-plugin", compilation => {
					compilation.hooks.processAssets.tap(
						{
							name: "copy-plugin",
							stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
						},
						() => {
							for (const filename of [
								"static-package.json",
								"static-package-str.json",
								"dynamic-package.json",
								"dynamic-package-str.json",
								"eager.json",
								"weak.json",
								"./nested/pkg.json",
								"re-export.json",
								"re-export-directly.json"
							]) {
								const resolvedFilename = path.resolve(__dirname, filename);
								const content = fs.readFileSync(resolvedFilename);
								compilation.emitAsset(
									filename.replace(/\.\/nested\//, ""),
									new RawSource(content)
								);
							}
						}
					);
				});
			}
		}
	],
	externals: {
		"./static-package.json": "module ./static-package.json",
		"./static-package-str.json": "module ./static-package-str.json",
		"./dynamic-package.json": "import ./dynamic-package.json",
		"./dynamic-package-str.json": "import ./dynamic-package-str.json",
		"./eager.json": "import ./eager.json",
		"./weak.json": "import ./weak.json",
		"./pkg.json": "import ./pkg.json",
		"./pkg": "import ./pkg.json",
		"./re-export.json": "module ./re-export.json",
		"./re-export-directly.json": "module ./re-export-directly.json",
		"./static-package-module-import.json":
			"module-import ./static-package.json",
		"./dynamic-package-module-import.json":
			"module-import ./dynamic-package.json"
	}
};
