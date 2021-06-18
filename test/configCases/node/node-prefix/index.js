import vm1 from "vm";
import vm2 from "node:vm";

it("should allow importing node builtin modules with the node: prefix", () => {
	expect(require("node:fs")).toBe(require("fs"));
	expect(require("node:path")).toBe(require("path"));
	expect(vm2).toBe(vm1);
});
