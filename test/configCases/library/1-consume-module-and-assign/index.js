import * as ns1 from "module1";
import * as ns2 from "module2";

it(
	"should be able to import exports from library (" + NAME + ")",
	async () => {
		expect(ns1.answer).toBe(42);
		expect(ns2.answer).toBe(42);

		expect(ns1.greet()).toBe("hi dep");
		expect(ns2.greet()).toBe("hi dep");

		await import("assign1");
		expect(global.assign.bee).toBe("b-dep");
		expect(global.assign.shout()).toBe("B-DEP");

		global.assign = undefined;

		await import("assign2");
		expect(global.assign.bee).toBe("b-dep");
		expect(global.assign.shout()).toBe("B-DEP");
	}
);
