import path from "path";
import { dirname, filename } from "./esm.js"
import { dirname as otherDirname, filename as otherFilename } from "./destructuring.js"

it("should bundle", async () => {
	const __dirname = __STATS__.children[__STATS_I__].outputPath;
	const __filename = path.join(__STATS__.children[__STATS_I__].outputPath, `./bundle${__STATS_I__}.mjs`);

	expect(dirname).toBe(__dirname);
	expect(filename).toBe(__filename);
	expect(otherDirname).toBe(__dirname);
	expect(otherFilename).toBe(__filename);
});
