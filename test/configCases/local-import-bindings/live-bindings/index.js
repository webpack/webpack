import { counter, bump, STEP } from "./counter";
import { readB, A_VALUE } from "./cycle-a";
import { readA, B_VALUE } from "./cycle-b";
import { STANDALONE } from "./standalone";

const resolve = (name) => eval(name);

it("keeps a reassigned export live", () => {
	expect(counter).toBe(0);
	bump();
	expect(counter).toBe(2);
	bump();
	expect(counter).toBe(4);
});

it("binds a const the reassigned export's module also exports", () => {
	expect(STEP).toBe(2);
	expect(resolve("STEP")).toBe(2);
});

it("leaves a const whose module evaluates inside a cycle alone", () => {
	expect(() => resolve("A_VALUE")).toThrow(ReferenceError);
	expect(() => resolve("B_VALUE")).toThrow(ReferenceError);
	expect(A_VALUE).toBe("a");
	expect(B_VALUE).toBe("b");
	expect(readA()).toBe("a");
	expect(readB()).toBe("b");
});

it("still binds a const reached outside every cycle", () => {
	expect(STANDALONE).toBe("standalone");
	expect(resolve("STANDALONE")).toBe("standalone");
});
