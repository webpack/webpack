import asset from "./asset.jpg";

it("should define public path", () => {
	expect(asset).toBe("http://test.co/path/asset.jpg");
});
