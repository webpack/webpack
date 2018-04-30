import def from "./module?harmony";
import * as mod from "./module?harmony-start"

it("should export a sequence expression correctly", function() {
	require("./module?cjs").should.be.eql({ default: 2 });
	def.should.be.eql(2);
	mod.default.should.be.eql(2);
});
