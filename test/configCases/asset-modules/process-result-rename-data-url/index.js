import url from "data:image/png;base64,iVBORw0KGgo=";

it("should inline a rewritten data-uri asset as what it now is", () => {
	// The media type the module was read with no longer describes the bytes.
	expect(url).toMatch(/^data:image\/webp;base64,/);
	expect(Buffer.from(url.split(",")[1], "base64").toString()).toBe(
		"webp-bytes"
	);
});
