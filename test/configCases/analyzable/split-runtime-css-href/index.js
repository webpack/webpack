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

it("should bake both stylesheet urls into the runtime chunk", () => {
	const dir = __STATS__.outputPath;
	const runtime = __STATS__.assets.find((asset) =>
		asset.name.startsWith("runtime.")
	).name;
	const css = (prefix) =>
		__STATS__.assets.find(
			(asset) => asset.name.startsWith(prefix) && asset.name.endsWith(".css")
		).name;
	const source = fs.readFileSync(path.join(dir, runtime), "utf8");

	const map = /cssUrls = \{[^}]*\}/.exec(source);
	expect(map).not.toBe(null);
	expect(map[0]).toContain(`"./${css("lazy_css.")}"`);
	expect(map[0]).toContain(`"./${css("main.")}"`);
	// Nothing reads the id-keyed lookup any more, so it does not ship.
	expect(source).not.toContain(`${"__webpack_require__"}.k(`);
});
