import fs from "fs";
import path from "path";
import asset from "./asset.txt";

it("should export the whole url and shed the public-path runtime", () => {
	expect(asset).toBe("https://cdn.example.com/x/asset.txt");
	const source = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	expect(source).not.toContain(`${"__webpack_require__"}.p`);
});
