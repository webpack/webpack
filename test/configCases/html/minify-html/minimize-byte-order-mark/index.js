import url from "./page.html";

it("should emit the page as an asset", () => {
	expect(url).toMatch(/page\.html$/);
});
