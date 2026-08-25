import fs from "fs";
import path from "path";
import { url } from "./shared";

it("should give each asset the path right where it is read from", () => {
	expect(url.href).toContain("assets/asset.txt");

	const dir = __STATS__.outputPath;
	const read = (name) => fs.readFileSync(path.join(dir, name), "utf8");
	// The host fetched this one, so it is not under the public path yet.
	expect(read("bundle0.mjs")).toContain('"./assets/asset.txt"');
	// The loader fetched this one through the public path, so the file is beside it.
	expect(read("shared_js.mjs")).toContain('"./asset.txt"');
	expect(read("bundle0.mjs")).not.toContain(`${"__webpack_require__"}.p +`);
	expect(read("shared_js.mjs")).not.toContain(`${"__webpack_require__"}.p +`);
});
