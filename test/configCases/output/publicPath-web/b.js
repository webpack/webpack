import asset from "./asset.jpg";

it("should define public path", () => {
	expect(asset).toBe("https://test.cases/path/asset.jpg");
});
