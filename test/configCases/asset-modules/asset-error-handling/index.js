const fs = require("fs");
const path = require("path");
import "./broken-style.css";

/*
 * This test intentionally triggers a compilation error in an asset module.
 * We're testing that when an asset module fails, webpack properly handles
 * the paths when attempting to emit the asset, specifically that it doesn't
 * try to create directories with invalid absolute paths concatenated.
 */
it("should handle paths for failed asset modules correctly", function() {
	const { errors } = this.stats.compilation;
	
	// Verifying if we have the expected error from our test loader
	expect(errors.length).toBeGreaterThan(0);
	const hasLoaderError = errors.some(error => 
		error.message && error.message.includes("Intentional error in asset processing")
	);
	expect(hasLoaderError).toBe(true);
	
	// We also verify that no output file was created for the failed asset
	const outputPath = path.join(__dirname, "dist", "broken-style.css");
	expect(fs.existsSync(outputPath)).toBe(false);
}); 