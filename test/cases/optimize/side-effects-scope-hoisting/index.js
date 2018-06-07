import { a } from "pmodule";

it("should not crash with null id", function() {
	expect(a).toBe("a");
});

if(Math === undefined)
	console.log(module); // prevent scope hoisting of this module
