import { x as ambiguous } from "./amb-export.js";
import { x as circular } from "./circ-1.js";

it("should report both link errors as build errors under futureDefaults", () => {
	expect(ambiguous).toBe(undefined);
	expect(circular).toBe(undefined);
});
