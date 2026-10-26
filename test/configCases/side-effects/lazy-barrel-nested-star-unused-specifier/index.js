import "./unused.js";
import { colors } from "ui";

it("should allow unused import through export * into a nested barrel with sibling used", () => {
	expect(colors).toBe("colors");
});

it("should keep deferred re-export target fonts.js unbuilt", () => {
	const built = __STATS__.modules
		.map((m) => m.name)
		.filter((name) => /ui\/theme\/fonts\.js$/.test(name));
	expect(built).toEqual([]);
});
