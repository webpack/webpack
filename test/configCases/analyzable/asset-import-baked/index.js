import fs from "fs";
import path from "path";
import asset from "./asset.txt";

it("should bake the wrapper's url and shed the public-path runtime", () => {
	expect(asset.endsWith("/asset.txt")).toBe(true);
	const source = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	expect(source).toContain(`${"module"}.exports = new URL("./asset.txt"`);
	expect(source).not.toContain(`${"__webpack_require__"}.p`);
});
