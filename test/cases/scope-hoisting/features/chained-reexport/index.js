import { named } from "./c";

it("chained-reexport: should have the correct values", function() {
	expect(named).toBe("named");
});
