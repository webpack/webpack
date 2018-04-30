import { test } from "./a";

it("should correctly tree shake star exports", function() {
	test.should.be.eql(123);
});
