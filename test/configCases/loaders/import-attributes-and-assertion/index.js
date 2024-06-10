import one from "./pkg-1.json" assert { type: "json" };
import two from "./pkg-2.json" with { type: "json" };
import three from "./pkg-3.json" assert { type: "json" };
import four from "./pkg-4.json" with { type: "json" };

it("import attributes and assertion should work", function() {
	expect(one.type).toEqual("assert");
	expect(two.type).toEqual("with");
	expect(three.type).toEqual("assert");
	expect(four.type).toEqual("with");
});

