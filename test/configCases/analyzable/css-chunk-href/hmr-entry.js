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

it("should keep the runtime url form for a runtime that can be updated", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.children[__INDEX__].outputPath, `${__NAME__}.mjs`),
		"utf8"
	);

	// The hot path re-loads by whatever id an update names, which a map written at build
	// time knows nothing about, so nothing here is written out and the lookup ships.
	expect(bundle).not.toContain(`new URL("./${__NAME__}-lazy_css.css"`);
	expect(bundle).toContain(`${"__webpack_require__"}.k = `);
	expect(bundle).toContain(`${"__webpack_require__"}.k(`);
});
