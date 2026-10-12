import { light } from "./barrel";

it("reads a re-exported CommonJS default through interop in a facade", async () => {
	expect(light).toBe("LIGHT_VALUE");
	const ns = await import("./barrel");
	expect(ns.Foo()).toBe("FOO_VALUE");
});
