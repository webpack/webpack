import value from "./dep";

export default value;
export const name = "module-lib";

it("should run as an ES module when library.type is module without explicit output.module", () => {
	expect(value).toBe(42);
	expect(name).toBe("module-lib");
});
