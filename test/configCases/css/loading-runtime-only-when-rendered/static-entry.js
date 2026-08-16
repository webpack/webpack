import "./style.css";
import fs from "fs";
import path from "path";
import { GLOBAL_HELPER, GLOBAL_MODULE } from "./needles.js";

// Nothing loads a chunk, so the css loading runtime module renders nothing and
// the `globalThis` polyfill it would have used is not shipped.
it("should not ship the global polyfill without chunk loading", () => {
	const { outputPath } = __STATS__.children[__STATS_I__];
	const source = fs.readFileSync(
		path.join(outputPath, "no-loading/main.mjs"),
		"utf-8"
	);
	expect(source).not.toContain(GLOBAL_MODULE);
	expect(source).not.toContain(GLOBAL_HELPER);
});
