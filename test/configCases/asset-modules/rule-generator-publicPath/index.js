import url from "../_images/file.png";

it("should import asset with rule.generator.publicPath", () => {
	expect(url).toEqual("assets/file.png");
});
