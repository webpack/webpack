import url from "./file.png";

it("should import asset with correct publicPath", () => {
	expect(url).toEqual("assets/file.png");
})
