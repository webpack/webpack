import value from "./module.ts";

const greeting: string = `hello-${value}`;

it("should let a registered ts-loader own .ts when experiments.typescript is auto", () => {
	expect(greeting).toBe("hello-from-module");
	expect(value).toBe("from-module");
});
