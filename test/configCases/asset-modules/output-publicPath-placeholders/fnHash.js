import url from "../_images/file.png";

it("should support function-form output.publicPath consuming data.hash", () => {
	expect(url).toMatch(/^fnhash\/[a-f0-9]+\/file\.png$/);
});
