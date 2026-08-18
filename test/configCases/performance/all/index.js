import { used } from "./barrel";

const reexportHints = () =>
	__STATS__.hints.filter((hint) =>
		/unused re-exports:/.test(hint.message)
	);

it("should run the checks that 'all' switched on", () => {
	expect(used).toBe(2);
	// Other checks `all` enabled may report too, depending on the suite.
	expect(reexportHints()).toHaveLength(1);
	expect(reexportHints()[0].message).toMatch(/\.\/unused\.js \(\d+ bytes\)/);
});
