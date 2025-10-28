import path from "path";
import { dirname as dirnameCommonJS, filename as filenameCommonJS } from "./commonjs.js"
import { dirname as dirnameESM, filename as filenameESM } from "./esm.js"
import { dirname as otherDirnameESM, filename as otherFilenameESM } from "./destructuring.js"

const __dirname = "dirname";
const __filename = "filename";

it("should bundle", () => {
	switch (NODE_VALUE) {
		case true:
			expect(dirnameCommonJS).toBe("");
			expect(filenameCommonJS).toBe("commonjs.js");
			expect(dirnameESM).toBe("");
			expect(filenameESM).toBe("esm.js");
			expect(otherDirnameESM).toBe("");
			expect(otherFilenameESM).toBe("destructuring.js");
			break;
		case "mock":
		case "warn-mock":
			expect(dirnameCommonJS).toBe("/");
			expect(filenameCommonJS).toBe("/index.js");
			expect(dirnameESM).toBe("/");
			expect(filenameESM).toBe("/index.js");
			expect(otherDirnameESM).toBe("/");
			expect(otherFilenameESM).toBe("/index.js");
			break;
		case "node-module": {
			const dirname = __STATS__.children[__STATS_I__].outputPath;
			const filename = path.join(__STATS__.children[__STATS_I__].outputPath, `./bundle${__STATS_I__}.mjs`);

			expect(dirnameCommonJS).toBe(dirname);
			expect(filenameCommonJS).toBe(filename);
			expect(dirnameESM).toBe(dirname);
			expect(filenameESM).toBe(filename);
			expect(otherDirnameESM).toBe(dirname);
			expect(otherFilenameESM).toBe(filename);
			break;
		}
		case false:
		case "eval-only": {
			const dirname = __STATS__.children[__STATS_I__].outputPath;
			const filename = path.join(
				__STATS__.children[__STATS_I__].outputPath,
				FORMAT === "esm" ? `./bundle${__STATS_I__}.mjs` : `./bundle${__STATS_I__}.js`
			);

			expect(dirnameCommonJS).toBe(dirname);
			expect(filenameCommonJS).toBe(filename);
			expect(dirnameESM).toBe(dirname);
			expect(filenameESM).toBe(filename);
			expect(otherDirnameESM).toBe(dirname);
			expect(otherFilenameESM).toBe(filename);
			break;
		}
	}
});
