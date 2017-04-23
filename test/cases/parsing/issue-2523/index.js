import A from "./module";
import { B } from "./module";
import { c } from "./module";

it("should allow to export a class", function() {
	expect((typeof A)).toEqual("function");
	expect((typeof B)).toEqual("function");
	expect(c).toEqual("c");
})