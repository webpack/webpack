import def, { a as aa, b, c, d, e } from "./module";
import f, { g } from "./commonjs";

it("should emit the correct warnings", function() {
	def, aa, b, c, d, e, f, g
});
