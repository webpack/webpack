import img from "./1.jpg";
import file from "./file.js";

it("should compile", () => {
	expect(typeof img).toBe("string");
	expect(typeof file).toBe("function");
});
