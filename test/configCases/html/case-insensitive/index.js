import page from "./page.html";

it("extracts assets from upper- and mixed-case tags and attributes", () => {
	// Every `./image.png` reference is rewritten to the emitted asset name,
	// proving the parser matched the tag/attribute names case-insensitively.
	expect(page).not.toContain("./image.png");
	// One rewritten reference per source attribute in page.html.
	expect(page.match(/[a-f0-9]+\.png/g)).toHaveLength(9);
	expect(page).toMatchSnapshot();
});
