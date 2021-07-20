import a from "./generate-many-replacements-loader?count=1000!./module";
import b from "./generate-many-replacements-loader?count=10000!./module";
import c from "./generate-many-replacements-loader?count=100000!./module";
import d from "./generate-many-replacements-loader?count=1000000!./module";

it("should compile fine", () => {
	expect(a).toBe(1000);
	expect(b).toBe(10000);
	expect(c).toBe(100000);
	expect(d).toBe(1000000);
});
