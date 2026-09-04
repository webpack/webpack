import value from "./module.ts";

const greeting: string = `hello-${value}`;

it("should let a path-scoped ts-loader own .ts/.tsx when experiments.typescript is auto", () => {
	expect(greeting).toBe("hello-from-module");
	expect(value).toBe("from-module");
});
