import "./style.css";
import fs from "fs";
import path from "path";
import { GLOBAL_HELPER, GLOBAL_MODULE } from "./needles.js";

// A chunk carrying css is loaded here, so the loading runtime module renders and
// reads the registry the polyfill provides.
it("should ship the global polyfill when a css chunk is loaded", async () => {
	const { lazy } = await import("./lazy.js");
	expect(lazy).toBe("lazy");
	const { outputPath } = __STATS__.children[__STATS_I__];
	const source = fs.readFileSync(
		path.join(outputPath, "loading/main.mjs"),
		"utf-8"
	);
	expect(source).toContain(GLOBAL_MODULE);
	expect(source).toContain(GLOBAL_HELPER);
});
