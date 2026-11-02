import value from "./value";
import plain from "./plain.js";
import steady from "./steady.js";

it("should retain unchanged modules while rebuilding their importer", () => {
	expect(value).toBe(Number(WATCH_STEP));
	expect(plain).toBe(0);
	expect(steady).toBe("steady");
});
