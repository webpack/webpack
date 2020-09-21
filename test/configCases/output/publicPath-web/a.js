import asset from "./asset.jpg";

it("should define public path", () => {
	expect(asset).toBe("https://test.cases/path/inner1/inner2/../../asset.jpg");
});
