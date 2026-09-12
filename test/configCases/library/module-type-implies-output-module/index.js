import { answer } from "./dep";

export default answer;
export const name = "module-library";

it("should run as an ECMAScript module without an explicit 'output.module'", () => {
	expect(answer).toBe(42);
	expect(name).toBe("module-library");
});
