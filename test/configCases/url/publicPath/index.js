import url from "../../../fixtures/images/file.png";

it("should import asset with correct publicPath", () => {
	expect(url).toEqual("assets/file.png");
});
