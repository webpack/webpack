let calls = 0;
const f = () => {
	calls++;
};
const name = String("a");
const flag = Math.random() < 2;

it("should keep a comma expression as the request of a context", () => {
	calls = 0;
	expect(() => require((f(), "./" + name))).toThrow("Cannot find module './a'");
	expect(() => require.resolve((f(), "./" + name))).toThrow(
		"Cannot find module './a'"
	);
	expect(() => require(flag ? (f(), "./a") : "./b")).toThrow(
		"Cannot find module './a'"
	);
	expect(calls).toBe(3);
});
