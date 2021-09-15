import { a, b } from "./module";
import * as empty from "./empty";

it("should skip over module", () => {
	empty.a = "not a";
	empty.b = "not b";
	expect(a).toBe("a");
	expect(b).toBe("b");
	expect(__STATS__.children.length).toBe(2);
	for (const stats of __STATS__.children) {
		const module = stats.modules.find(m => m.name.endsWith("module.js"));
		expect(module).toHaveProperty("orphan", true);
	}
});
