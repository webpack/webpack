import { used } from "./module";

it("should not include unused assets", () => {
	expect(used.href).toMatch(/png/);
	expect(__STATS__.modules.find(m => m.name.includes("file.png?used"))).toEqual(
		expect.objectContaining({
			orphan: false
		})
	);
	expect(
		__STATS__.modules.find(m => m.name.includes("file.png?default"))
	).toEqual(
		expect.objectContaining({
			orphan: true
		})
	);
	expect(
		__STATS__.modules.find(m => m.name.includes("file.png?named"))
	).toEqual(
		expect.objectContaining({
			orphan: true
		})
	);
	expect(
		__STATS__.modules.find(m => m.name.includes("file.png?indirect"))
	).toEqual(
		expect.objectContaining({
			orphan: true
		})
	);
});
