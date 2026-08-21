import fs from "fs";
import path from "path";

it("should load the stylesheet the baked url names", async () => {
	await import("./lazy.css");

	// The neutral runtime guards the DOM, so the stylesheet only lands where there is one.
	if (typeof document !== "undefined") {
		expect(getComputedStyle(document.body).getPropertyValue("background")).toBe(
			" red"
		);
	}
});

it("should write the stylesheet url out and drop what built it", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.children[__INDEX__].outputPath, `${__NAME__}.mjs`),
		"utf8"
	);

	expect(bundle).toContain(`new URL("./${__NAME__}-lazy_css.css"`);
	// Nothing reads the id-keyed lookup or the public path any more, so neither ships.
	expect(bundle).not.toContain(`${"__webpack_require__"}.k = `);
	expect(bundle).not.toContain(`${"__webpack_require__"}.p = `);
});
