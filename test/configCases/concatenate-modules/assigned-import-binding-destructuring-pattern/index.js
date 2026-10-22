import * as namespace from "./state";
import { read, value } from "./state";

function loopDestructured() {
	for ({ value } of [{ value: 2 }]) {
		// the write happens before the body runs
	}
}

function writeNamespaceMember() {
	({ value: namespace.value } = { value: 3 });
}

function writeNamespaceMemberElement() {
	[namespace.value] = [4];
}

function loopNamespaceMember() {
	for ({ value: namespace.value } of [{ value: 5 }]) {
		// a namespace member is read-only through a pattern too
	}
}

it("should reject a destructuring write through a loop binding", () => {
	expect(loopDestructured).toThrow();
});

it("should reject a destructuring write to a namespace member", () => {
	expect(writeNamespaceMember).toThrow(TypeError);
	expect(writeNamespaceMemberElement).toThrow(TypeError);
	expect(loopNamespaceMember).toThrow(TypeError);
});

it("should leave the imported binding untouched", () => {
	expect(read()).toBe(1);
	expect(value).toBe(1);
	expect(namespace.value).toBe(1);
});

it("should keep the writing module out of concatenation", () => {
	expect(__STATS__.modules.filter((m) => m.modules)).toHaveLength(0);
});
