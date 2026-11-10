import A from "./module";
import { B } from "./module";
import { c } from "./module";

it("issue-2523: should allow to export a class", function() {
	expect((typeof A)).toBe("function");
	expect((typeof B)).toBe("function");
	expect(c).toBe("c");
})
