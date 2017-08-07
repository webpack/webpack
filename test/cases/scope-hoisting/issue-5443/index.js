import { module } from "./reexport";

it("should have the correct values", function() {
	module.should.be.eql({
		default: "default",
		named: "named"
	});
});
