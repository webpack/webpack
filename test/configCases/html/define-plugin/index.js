import html from "./index.html";

it("should replace identifiers in HTML", () => {
	expect(html).toContain("<title>\"hello world\"</title>");
	expect(html).toContain("<p>Env is \"production\"</p>");
});
