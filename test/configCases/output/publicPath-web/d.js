import asset from "./asset.jpg";

it("should define public path", () => {
	expect(asset).toBe("/other/asset.jpg");
});
