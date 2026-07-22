import html from "./index.html";

it("should pick longest match when keys overlap", () => {
	expect(html).toContain("<title>\"webpack\"</title>");
	// specific key wins over its prefix
	expect(html).toContain("<p>env is \"production\"</p>");
	// prefix only matches where the specific key does not
	expect(html).toContain("<p>prefix is \"env\"</p>");
});
