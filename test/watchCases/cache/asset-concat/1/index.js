it("should generate assets correctly", () => {
	const png = require("./images/file.png");
	const svg = require("./images/file.svg");
	const jpg = require("./images/file.jpg");

	expect(png).toMatch(/^data:image\/png;base64,/);
	expect(svg).toMatch(/^data:image\/svg\+xml;base64,/);
	expect(jpg).toMatch(/\.jpg$/);
});
