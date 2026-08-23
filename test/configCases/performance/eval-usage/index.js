import a from "./a";
import b from "./b";

it("should report modules that call eval directly", () => {
	expect(a + b).toBe(4);
});
