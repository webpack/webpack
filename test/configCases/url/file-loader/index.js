import url from "../../../fixtures/images/file.png";

it("should use file-loader", () => {
	expect(url).toEqual("file-loader.png");
});
