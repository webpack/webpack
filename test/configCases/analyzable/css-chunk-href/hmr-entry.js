import fs from "fs";
import path from "path";

it("should still load the stylesheet with the hot handler present", async () => {
	await import("./lazy.css");

	// The neutral runtime guards the DOM, so the stylesheet only lands where there is one.
	if (typeof document !== "undefined") {
		expect(getComputedStyle(document.body).getPropertyValue("background")).toBe(
			" red"
		);
	}
});

it("should write the stylesheet url out for a runtime that can be updated", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.children[__INDEX__].outputPath, `${__NAME__}.mjs`),
		"utf8"
	);

	// Every url here is settled at build time, so an update that changes the map
	// re-ships the runtime module holding it, and the loader reads the map.
	expect(bundle).toContain(`new URL("./${__NAME__}-lazy_css.css"`);
	expect(bundle).toContain("const url = cssUrls[chunkId]();");
	// The hot handler still re-loads a stylesheet by id, so the lookup ships for it.
	expect(bundle).toContain(`${"__webpack_require__"}.k = `);
});
