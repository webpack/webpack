import * as file from "./file";
import * as file2 from "./file2";

it("should translate indexed access to harmony import correctly", function() {
	file["default"].should.be.eql("default");
	file["abc"].should.be.eql("abc");
});

it("should translate dynamic indexed access to harmony import correctly", function() {
	var fault = "fault";
	file2["de" + fault].should.be.eql("default");
	file2["abc"].should.be.eql("abc");
});
