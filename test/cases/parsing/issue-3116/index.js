import * as file from "./file";

it("should translate indexed access to harmony import correctly", function() {
	file["default"].should.be.eql("default");
	file["abc"].should.be.eql("abc");
});
