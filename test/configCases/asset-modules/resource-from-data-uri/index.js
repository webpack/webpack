import asset from "data:image/svg+xml;utf8,<svg><title>icon-square-small</title></svg>"

it("should compile with correct filename", () => {
	expect(asset).toMatch(/public\/media\/\.[0-9a-zA-Z]{8}\.svg/);
});
