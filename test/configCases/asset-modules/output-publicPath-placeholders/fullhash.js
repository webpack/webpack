import url from "../_images/file.png";

it("should interpolate [fullhash] in output.publicPath", () => {
	expect(url).toMatch(/^fh\/[a-f0-9]+\/file\.png$/);
});
