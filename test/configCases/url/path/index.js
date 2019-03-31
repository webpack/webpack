import url from "../../../fixtures/images/file.png";

it("should output asset with path", () => {
	expect(url).toEqual("images/file.png");
});
