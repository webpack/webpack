import url from "../_images/file.png";

it("should support function-form output.publicPath returning a string with [fullhash:N]", () => {
	expect(url).toMatch(/^fnph\/[a-f0-9]{8}\/file\.png$/);
});
