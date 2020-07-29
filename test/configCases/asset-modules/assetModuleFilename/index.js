import png from "../_images/file.png";
import svg from "../_images/file.svg";

it("should change filenames", () => {
	expect(png).toEqual("images/[ext]/success-png.png");
	expect(svg).toEqual("images/success-svg.svg");
});
