import { named } from "./barrel.js";

it("should keep a name reached through a star re-export working", () => {
	expect(named()).toBe("named");
});

it("should replay the groups it already activated when every export is asked for", () =>
	import("./all.js").then(({ named: alsoNamed, local }) => {
		expect(alsoNamed()).toBe("named");
		expect(local).toBe("helper");
	}));
