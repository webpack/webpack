import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { readFileSync, readdirSync, existsSync } from "fs";

it("should keep module-import externals in the dynamic chunk", function (done) {
	let bundleDir;
	const currentUrl = import.meta.url;

	if (currentUrl.includes("configCases")) {
		// Test runner maps URL to source directory, construct output path manually
		// Output is in test/js/ConfigTestCases/externals/module-import-in-chunk/
		bundleDir = resolve(
			process.cwd(),
			"test/js/ConfigTestCases/externals/module-import-in-chunk"
		);
	} else {
		bundleDir = dirname(fileURLToPath(currentUrl));
	}

	// Check that the main entry does NOT contain the external import
	// Look for the webpack external module pattern specific to our external
	var mainSource = readFileSync(join(bundleDir, "main.mjs"), "utf-8");
	var hasExternalInMain = /import.*__WEBPACK_EXTERNAL_MODULE_node_fs/.test(
		mainSource
	);
	expect(hasExternalInMain).toBe(false);

	// Check that the dynamic chunk DOES contain the external import
	var chunkFiles = readdirSync(bundleDir).filter(function (f) {
		return f.endsWith(".mjs") && f !== "main.mjs";
	});
	expect(chunkFiles.length).toBeGreaterThan(0);

	var foundExternal = false;
	for (var i = 0; i < chunkFiles.length; i++) {
		var chunkPath = join(bundleDir, chunkFiles[i]);
		var chunkSource = readFileSync(chunkPath, "utf-8");
		if (/import.*__WEBPACK_EXTERNAL_MODULE_node_fs/.test(chunkSource)) {
			foundExternal = true;
			break;
		}
	}
	expect(foundExternal).toBe(true);

	// Import the chunk to complete the test
	import("./chunk").then(function () {
		done();
	});
});
