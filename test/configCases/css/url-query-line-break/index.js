import text from "./style.css";

it("should escape line breaks of an asset url in the emitted CSS", () => {
	expect(text).not.toMatch(/[\r\f]/);
	expect(text).toContain("url(/img.png?a\\d b)");
	expect(text).toContain("url(/img.png?c\\c d)");
	expect(text).toContain("url(/img.png?e\\a f)");
	expect(text).toContain('url("/img.png?g\\d h i")');
	expect(text.match(/\{/g)).toHaveLength(4);
	expect(text.match(/\}/g)).toHaveLength(4);
});
