import { count, increment, aliased } from "library";
import {
	count as rcCount,
	increment as rcIncrement,
	aliased as rcAliased
} from "library-runtime-chunk";

it("should keep live bindings to a module library's entry exports", () => {
	expect(count).toBe(0);
	expect(aliased).toBe(0);
	increment();
	expect(count).toBe(1);
	expect(aliased).toBe(1);
});

it("should keep live bindings when the runtime is a separate chunk", () => {
	expect(rcCount).toBe(0);
	expect(rcAliased).toBe(0);
	rcIncrement();
	expect(rcCount).toBe(1);
	expect(rcAliased).toBe(1);
});
