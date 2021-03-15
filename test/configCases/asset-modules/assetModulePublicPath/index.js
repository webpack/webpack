import url from "../_images/file.png";

it("should import asset with output.assetModulePublicPath", () => {
	expect(url).toEqual("/assets/file.png");
});
