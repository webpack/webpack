import * as file from "./file";
import * as file2 from "./file2";

it("should translate indexed access to harmony import correctly", function() {
	expect(file["default"]).toEqual("default");
	expect(file["abc"]).toEqual("abc");
});

it("should translate dynamic indexed access to harmony import correctly", function() {
	var fault = "fault";
	expect(file2["de" + fault]).toEqual("default");
	expect(file2["abc"]).toEqual("abc");
});
