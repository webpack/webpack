const page = require("./page.html");

it("should ignore a <base> inside an inert <template>", () => {
	// The image resolves against the document (`./icon.png`), not the template's
	// `./missing-dir/` base — so it builds and is rewritten to the emitted asset.
	// (If the base applied, `./missing-dir/icon.png` would fail to resolve.)
	expect(page).not.toContain('src="./icon.png"');
	expect(page).toMatch(/<img src="icon\.png"/);
	expect(page).not.toContain("missing-dir/icon.png");
	// The inert template's `<base>` itself is preserved verbatim.
	expect(page).toContain('<base href="./missing-dir/">');
});
