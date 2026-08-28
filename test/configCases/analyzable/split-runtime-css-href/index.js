import fs from "fs";
import path from "path";

import "./initial.css";

it("should load the stylesheet the baked url names", async () => {
	await import("./lazy.css");

	// The neutral runtime guards the DOM, so the stylesheet only lands where there is one.
	if (typeof document !== "undefined") {
		expect(getComputedStyle(document.body).getPropertyValue("background")).toBe(
			" red"
		);
	}
});

it("should bake the lazy url and leave the entry's to the runtime lookup", () => {
	const dir = __STATS__.outputPath;
	const runtime = __STATS__.assets.find((asset) =>
		asset.name.startsWith("runtime.")
	).name;
	const lazy = __STATS__.assets.find(
		(asset) => asset.name.startsWith("lazy_css.") && asset.name.endsWith(".css")
	).name;
	const source = fs.readFileSync(path.join(dir, runtime), "utf8");

	// The map holds what could be named, and only that.
	const map = /cssUrls = \{[^}]*\}/.exec(source);
	expect(map).not.toBe(null);
	expect(map[0]).toContain(`"./${lazy}"`);
	expect(map[0]).not.toContain('"main":');
	// An id the map lacks builds its url the runtime way, so both globals still ship.
	expect(source).toContain(
		`cssUrls[chunkId] ? cssUrls[chunkId]() : ${"__webpack_require__"}.p + ${"__webpack_require__"}.k(chunkId)`
	);
});
