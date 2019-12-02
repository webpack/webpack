import png from "../_images/file.png";
import svg from "../_images/file.svg";
import jpg from "../_images/file.jpg";

it("should generate various data-url types", () => {
	expect(png).toContain("data:image/png;base64,");
	expect(svg).toContain("data:image/svg+xml;base64");
	expect(jpg).toContain("data:image/jpeg;base64,");
});
