import { test } from "./a";
import { func1, func3 } from "./x";

it("should correctly tree shake star exports", function() {
	test.should.be.eql(123);
	func1().should.be.eql("func1");
	func3().should.be.eql("func3");
});
