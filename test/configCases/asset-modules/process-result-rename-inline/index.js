import url from "../_images/file.png";

it("should inline the asset as the format the hook made it", () => {
	expect(url).toMatch(/^data:image\/webp;base64,/);
});

it("should inline what the hook returned", () => {
	expect(Buffer.from(url.split(",")[1], "base64").toString()).toBe(
		"webp-bytes"
	);
});
