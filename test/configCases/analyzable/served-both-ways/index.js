import fs from "fs";
import path from "path";
// Statically here, so this copy sits in the initial chunk the host fetched. The other
// entry imports it dynamically, putting a second copy in a chunk the loader fetched.
import { url } from "./shared";

it("should bake a url a public path of no depth serves the same either way", () => {
	expect(url.href).toContain("asset.txt");

	const source = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	expect(source).toContain('new URL(/* asset import */ "./asset.txt"');
	expect(source).not.toContain(`${"__webpack_require__"}.p +`);
});
