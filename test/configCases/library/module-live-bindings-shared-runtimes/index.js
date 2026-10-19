import * as a from "./a.mjs";
import * as b from "./b.mjs";
import * as direct from "./direct.mjs";
import { run } from "./consumer.mjs";

it("should initialize exports from a chunk shared by separate runtimes", () => {
	expect(a.count).toBe(1);
	expect(a.total).toBe(10);
	expect(b.count).toBe(1);
	expect(b.total).toBe(10);
});

it("should keep shared chunk exports live and independent in each runtime", () => {
	a.bump();
	expect(a.count).toBe(2);
	expect(a.total).toBe(20);
	expect(b.count).toBe(1);
	expect(b.total).toBe(10);
	b.bump();
	b.bump();
	expect(a.count).toBe(2);
	expect(a.total).toBe(20);
	expect(b.count).toBe(3);
	expect(b.total).toBe(30);
});

it("should share the chunk with a runtime that does not register the binding", () => {
	expect(run()).toEqual([
		[1, 10],
		[2, 20]
	]);
	expect(a.count).toBe(2);
	expect(a.total).toBe(20);
	expect(b.count).toBe(3);
	expect(b.total).toBe(30);
});

it("should keep direct exports live in a runtime outside the shared chunk", () => {
	expect(direct.count).toBe(1);
	expect(direct.total).toBe(10);
	direct.bump();
	expect(direct.count).toBe(2);
	expect(direct.total).toBe(20);
	expect(a.count).toBe(2);
	expect(a.total).toBe(20);
	expect(b.count).toBe(3);
	expect(b.total).toBe(30);
});
