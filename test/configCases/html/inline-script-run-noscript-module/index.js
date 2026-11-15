import page from "./page.html";

it("should keep a script inside noscript out of the module run", () => {
	expect(page).toContain("<noscript><script");
	expect(page).toMatch(/<noscript><script[^>]*>[^<]*<\/script><\/noscript>/);
});
