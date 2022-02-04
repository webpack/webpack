import "./a";

const doc = console;

export default 1;

it("should compile and run", () => {
	expect(doc).toBe(console);
});
