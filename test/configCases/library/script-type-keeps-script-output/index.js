import { answer } from "./dep";

export default answer;

it("should stay a script under futureDefaults", () => {
	expect(answer).toBe(42);
});
