import url from "../_images/file.png";

it("should import asset with empty string rule.generator.publicPath", () => {
	expect(url).toEqual("file.png");
});
