import png from "../_images/file.png";
import svg from "../_images/file.svg";
import jpg from "../_images/file.jpg";

it("should generate various asset types by a custom encoder", () => {
	expect(png).toEqual("7fd64cadadf9a0a1b0c1.png");
	expect(jpg).toEqual("5aab95c98ee94873c7a2.jpg");
	expect(svg).toEqual("data:image/svg+xml;base64,custom-content");
});
