import { module } from "./reexport";

it("issue-5443: should have the correct values", function() {
	expect(module).toEqual(nsObj({
		default: "default",
		named: "named"
	}));
});
