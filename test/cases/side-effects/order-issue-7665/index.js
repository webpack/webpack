import array from "./tracker";
import { b } from "./module";

it("should evaluate modules in the correct order", () => {
	expect(b).toEqual("b");
	expect(array).toEqual(["b", "a"]);
})
