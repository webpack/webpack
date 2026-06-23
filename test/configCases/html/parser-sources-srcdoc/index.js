import page from "./page.html";

it("applies the `srcdoc` source type to iframe[srcdoc] and a custom tag/attribute", () => {
	expect(typeof page).toBe("string");
	expect(page).toMatchSnapshot();

	expect(page).not.toContain("./pixel.png");

	// Built-in `<iframe srcdoc>` (kept via "..." in the sources option).
	expect(page).toMatch(/<iframe srcdoc="<img src=&quot;handled-pixel\.png&quot;>">/);

	// A custom `div[data-html]` re-using the same `srcdoc` logic via `sources`.
	expect(page).toMatch(
		/<div data-html="<img src=&quot;handled-pixel\.png&quot;>"><\/div>/
	);
});
