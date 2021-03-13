import png from "../_images/file.png";
import svg from "../_images/file.svg";
import svg2 from "../_images/file.svg?custom2";

it("should change filenames", () => {
	expect(png).toEqual("images/[ext]/success-png.png");
	expect(svg).toEqual("images/success-svg.svg");
	expect(svg2).toEqual("custom-images/success.svg");
});
