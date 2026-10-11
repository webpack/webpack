import { meta as otherMeta, readCustom } from "./other";

const meta = import.meta;

it("should read alias mutations through direct and destructured accesses", () => {
	meta.custom = 42;
	expect(import.meta.custom).toBe(42);
	expect(import.meta["custom"]).toBe(42);
	expect(typeof import.meta.custom).toBe("number");
	const { custom } = import.meta;
	expect(custom).toBe(42);
	expect(meta).toBe(import.meta);
});

it("should observe direct writes and deletions through the alias", () => {
	meta.count = 1;
	import.meta.count++;
	expect(meta.count).toBe(2);
	import.meta.count = 3;
	expect(meta.count).toBe(3);
	delete import.meta.count;
	expect(meta.count).toBeUndefined();
	meta.count = 4;
	delete meta.count;
	expect(import.meta.count).toBeUndefined();
});

it("should use the same receiver for methods on import.meta", () => {
	meta.read = function () {
		return this;
	};
	expect(import.meta.read()).toBe(meta);
});

it("should keep alias mutations local to the module", () => {
	meta.custom = 42;
	expect(otherMeta.custom).toBeUndefined();
	expect(readCustom()).toBeUndefined();
	otherMeta.custom = 7;
	expect(readCustom()).toBe(7);
	expect(import.meta.custom).toBe(42);
});

it("should keep direct mutations visible through the shared prototype", () => {
	import.meta.shared = "HELLO";
	expect(meta.shared).toBe("HELLO");
	expect(otherMeta.shared).toBe("HELLO");
	const { shared } = import.meta;
	expect(shared).toBe("HELLO");
	import.meta.shared = "UPDATED";
	expect(otherMeta.shared).toBe("UPDATED");
	delete import.meta.shared;
	expect(meta.shared).toBeUndefined();
	expect(otherMeta.shared).toBeUndefined();
});
