import html from "./index.html";

it("should substitute the html-typed define into HTML", () => {
	expect(html).toContain("<p>html value</p>");
});

it("should keep html-typed defines out of JavaScript object expansion", () => {
	expect(JSON.parse(JSON.stringify(CFG))).toEqual({ js: "ok" });
});
