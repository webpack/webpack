const page = require("./page.html");

it("should leave a disabled built-in source untouched (`type: false`)", () => {
	// The built-in `<img src>` source was disabled, so its URL is not rewritten.
	expect(page).toContain('src="./hero.png"');
});

it("should still apply the other sources", () => {
	// The added `data-src` source is rewritten to the emitted asset.
	expect(page).not.toContain('data-src="./hero.png"');
	expect(page).toMatch(/data-src="hero\.png"/);
});
