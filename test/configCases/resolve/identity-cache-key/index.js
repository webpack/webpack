import results from "./loader!./loader";

it("should distinguish plugins that differ only in closure state", () => {
	expect(results.closureA).toBe("a.js");
	expect(results.closureB).toBe("b.js");
});

it("should distinguish plugin instances that differ only in hidden state", () => {
	expect(results.hiddenA).toBe("a.js");
	expect(results.hiddenB).toBe("b.js");
});

it("should distinguish plugin instances that serialize the same", () => {
	expect(results.serializableA).toBe("a.js");
	expect(results.serializableB).toBe("b.js");
});

it("should share a resolver when the same plugin is passed again", () => {
	expect(results.shared1).toBe("a.js");
	expect(results.shared2).toBe("a.js");
	expect(results.sharedApplied).toBe(1);
});

it("should accept a file system that has been used", () => {
	expect(results.fileSystem).toBe("module.js");
});
