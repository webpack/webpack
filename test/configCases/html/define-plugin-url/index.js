import html from "./index.html";

it("should substitute before parsing, so a URL built from a define resolves", () => {
	expect(html).not.toContain("%ASSET_BASE%");
	expect(html).toMatch(/href="[^"]*\.css"/);
});

it("should pass the module to a runtimeValue in a text module", () => {
	expect(html).toContain("<p>module:index.html</p>");
});
