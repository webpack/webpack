import fs from "fs";
import path from "path";

// Reassigned here, so where the stylesheet sits is only known once this runs.
__webpack_public_path__ = "./";

it("should still load the stylesheet through the runtime form", async () => {
	await import("./lazy.css");

	// The neutral runtime guards the DOM, so the stylesheet only lands where there is one.
	if (typeof document !== "undefined") {
		expect(getComputedStyle(document.body).getPropertyValue("background")).toBe(
			" red"
		);
	}
});

it("should keep what builds the url when no literal can name it", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.children[__INDEX__].outputPath, `${__NAME__}.mjs`),
		"utf8"
	);

	expect(bundle).not.toContain(`new URL("./${__NAME__}-lazy_css.css"`);
	// The loader still reaches for both, so both have to ship.
	expect(bundle).toContain(`${"__webpack_require__"}.k = `);
	expect(bundle).toContain(`${"__webpack_require__"}.p = `);
});
