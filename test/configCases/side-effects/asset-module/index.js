import bytes from "./unused.png?bytes";
import inlined from "./unused.png?inline";
import source from "./unused.png?source";
import resource from "./used.png";

it("should not include unused assets", () => {
	expect(resource).toMatch(/\.png/);
	expect(__STATS__.modules.find((m) => m.name.includes("/used.png"))).toEqual(
		expect.objectContaining({
			orphan: false
		})
	);

	console.log(__STATS__.modules);

	for (const stat of __STATS__.modules.filter((m) =>
		m.name.includes("/unused.png")
	)) {
		expect(stat).toEqual(
			expect.objectContaining({
				orphan: true
			})
		);
	}
});
