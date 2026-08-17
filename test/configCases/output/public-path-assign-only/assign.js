import fs from "fs";
import path from "path";

// Assigns the public path and never reads it back.
__webpack_public_path__ = "/from-runtime/";

export const value = "assigned";

it("should ship the publicPath runtime module only where something reads it", () => {
	const source = fs.readFileSync(
		path.join(__STATS__.children[__INDEX__].outputPath, __NAME__, "main.mjs"),
		"utf-8"
	);

	// The assignment itself survives either way.
	expect(source).toMatch(/__webpack_require__\.p = "\/from-runtime\/"/);
	expect(/webpack\/runtime\/publicPath/.test(source)).toBe(__READS__);
});
