import { named } from "./c";

it("reexport-cjs: should have the correct values", function() {
	expect(named).toBe("named");
});
