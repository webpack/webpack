import page from "./page.html";

it("should rewrite asset URLs inside <iframe srcdoc>", () => {
	expect(typeof page).toBe("string");
	expect(page).toMatchSnapshot();

	// The img inside srcdoc had its src rewritten to a hashed asset URL.
	expect(page).not.toContain("./pixel.png");
	expect(page).toContain("handled-pixel.png");

	// The processed HTML is re-escaped so the outer `srcdoc="..."` stays valid:
	// `"` -> `&quot;` and a decoded `'` (in the alt) -> `&#39;`.
	expect(page).toMatch(
		/srcdoc="<img src=&quot;handled-pixel\.png&quot; alt=&quot;a&#39;b&quot;>"/
	);

	// A srcdoc with no markup is left untouched (no nested module spun up).
	expect(page).toContain('srcdoc="no assets here"');
});
