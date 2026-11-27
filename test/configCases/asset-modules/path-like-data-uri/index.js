import url from "./generated/data:text/html,/image.png";

it("should name an asset in a directory named like a data uri by its file", () => {
	expect(url).toMatch(/image\.[0-9a-f]{8}\.png$/);
});
