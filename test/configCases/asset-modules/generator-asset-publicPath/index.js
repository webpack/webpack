import url from "../_images/file.png";

it("should import asset with module.generator.asset.publicPath", () => {
	expect(url).toEqual("assets/file.png");
});
