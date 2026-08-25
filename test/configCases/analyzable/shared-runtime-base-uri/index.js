import fs from "fs";
import path from "path";
import { url } from "./shared";

it("should spell the one base the shared runtime actually sets", () => {
	// Both entries resolve against the first entry's base, because there is only one
	// `__webpack_require__.b` for them to read — so both bake that same base.
	expect(url.href).toBe("https://first.example/asset.txt");

	const dir = __STATS__.outputPath;
	const read = (name) => fs.readFileSync(path.join(dir, name), "utf8");
	expect(read("side.mjs")).toContain('"https://first.example/asset.txt"');
	// Nothing reads the base any more, so the runtime module that set it is gone.
	expect(read("runtime.mjs")).not.toContain(`${"__webpack_require__"}.b =`);
});
