import png from "./images/file.png";
import svg from "./images/file.svg";
import jpg from "./images/file.jpg";

it("should generate assets correctly", () => {
	expect(png).toMatch(/^data:image\/png;base64,/);
	expect(svg).toMatch(/^data:image\/svg\+xml;base64,/);
	expect(jpg).toMatch(/\.jpg$/);
});
