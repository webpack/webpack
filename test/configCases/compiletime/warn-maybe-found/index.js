import * as Stub from "./stub";

it("should compile", function () {
	if (typeof Stub.NotHere !== "undefined") {
		throw new Error("This shouldn't be here!");
	}
	if (typeof Stub.Here === "undefined") {
		throw new Error("This should be here!");
	}
});
