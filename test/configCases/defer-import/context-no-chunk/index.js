import { pick } from "./pick.js";
import { state } from "./state.js";

const fs = require("fs");
const path = require("path");

it("defers evaluation of a context module kept in the initial chunk", async () => {
	state.evaluated = 0;
	const ns = await import(
		/* webpackDefer: true, webpackMode: "lazy" */ "./mods/" + pick()
	);
	// With `chunkLoading: false` the module lives in the initial chunk, but
	// `import.defer` must not evaluate it until first access.
	expect(state.evaluated).toBe(0);
	expect(ns.default).toBe("a-value");
	expect(state.evaluated).toBe(1);
});

it("should not ship a chunk loader when the context has no chunk to load", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.js"),
		"utf8"
	);

	expect(bundle).not.toContain(`${"__webpack_require__"}.e =`);
});
