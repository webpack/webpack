import * as file from "./file";
import * as file2 from "./file2";

it("should translate indexed access to harmony import correctly", function() {
	expect(file["default"]).toBe("default");
	expect(file["abc"]).toBe("abc");
});

it("should translate dynamic indexed access to harmony import correctly", function() {
	var fault = "fault";
	expect(file2["de" + fault]).toBe("default");
	expect(file2["abc"]).toBe("abc");
});
