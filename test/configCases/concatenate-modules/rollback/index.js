import { value as before } from "./before";
import { value as cycle } from "./cycle";
import { read } from "./a-cycle";
import { value as readCycle } from "./b-cycle";
import { value as candidate } from "./candidate";
import { value as first } from "./a-completed";
import { value as second } from "./b-completed";
import { value as deep } from "./y-deep";
import { value as active } from "./z-active";
import { value as blocked } from "./blocked";
import { value as after } from "./after";

it("should preserve imports across failed concatenation attempts", () => {
	expect([before, cycle, read(), readCycle()]).toEqual([1, 10, 12, 12]);
	expect([candidate, first, second, deep, active, blocked, after]).toEqual([
		2, 3, 4, 5, 6, 7, 8
	]);
});

it("should keep accepted modules and concatenate later candidates", () => {
	const concatenated = __STATS__.modules.filter((module) => module.modules);
	expect(concatenated.map((module) => module.modules.map((inner) => inner.name).sort())).toEqual([
		[
			"./a-completed.js",
			"./a-cycle.js",
			"./after.js",
			"./b-completed.js",
			"./b-cycle.js",
			"./before.js",
			"./completed-dependency.js",
			"./cycle.js",
			"./index.js"
		]
	]);
});
