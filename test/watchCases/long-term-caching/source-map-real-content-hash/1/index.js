import check from "./check";

const step = "second";

it("should point the source map at the rehashed file", () => {
	expect(step).toBe("second");
	const name = check();
	expect(name).not.toBe(STATE.first);
});
