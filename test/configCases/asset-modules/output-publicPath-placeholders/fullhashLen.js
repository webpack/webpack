import url from "../_images/file.png";

it("should interpolate [fullhash:N] in output.publicPath", () => {
	expect(url).toMatch(/^fhl\/[a-f0-9]{8}\/file\.png$/);
});
