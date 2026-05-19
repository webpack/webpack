import value from "./module.ts";

const greeting: string = `hello-${value}`;

it("should work with experiments.typescript and ts-loader together", () => {
	expect(greeting).toBe("hello-from-module");
	expect(value).toBe("from-module");
});
