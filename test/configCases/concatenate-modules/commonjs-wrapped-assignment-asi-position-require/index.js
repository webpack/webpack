import { read, report } from "./body";

it("should write through a required wrapped module at a statement start", () => {
	expect(report()).toEqual([
		"assign",
		"compound",
		"update",
		"computed",
		"deep",
		"delete",
		"read"
	]);

	const nested = read();

	expect(nested.value).toBe("assigned");
	expect(nested.count).toBe(4);
	expect(nested.flag).toBe(true);
	expect(nested.deep.leaf).toBe("reassigned");
	expect("gone" in nested).toBe(false);
});
