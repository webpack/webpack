import png from "../_images/file.png";
import svg from "../_images/file.svg";
import jpg from "../_images/file.jpg";

it("should output various asset types", () => {
	expect(png).toEqual("7fd64cadadf9a0a1b0c1.png");
	expect(svg).toEqual("642897943e4a7da2a25e.svg");
	expect(jpg).toEqual("5aab95c98ee94873c7a2.jpg");
});
