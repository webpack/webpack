import { module } from "./reexport";

it("should have the correct values", function() {
	expect(module).toEqual({
		default: "default",
		named: "named",
		[Symbol.toStringTag]: "Module"
	});
});
