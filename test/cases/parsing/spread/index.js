import X, { A, B } from "./module";
import * as M from "./module";

it("should support spread operator", function() {
	var o1 = { ...X };
	o1.should.be.eql({ A: "A", B: "B" });
	var o2 = { ...({ X }) };
	o2.should.be.eql({ X: { A: "A", B: "B" } });
	var o3 = { ...M };
	o3.should.be.eql({ default: { A: "A", B: "B" }, A: "A", B: "B" });
});
