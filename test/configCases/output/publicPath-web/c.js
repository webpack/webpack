import asset from "./asset.jpg";

it("should define public path", () => {
	expect(asset).toBe("/other/inner1/inner2/../../asset.jpg");
});
