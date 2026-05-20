import url from "../_images/file.png";

it("should support function-form output.publicPath returning a plain string", () => {
	expect(url).toBe("fnstr/file.png");
});
