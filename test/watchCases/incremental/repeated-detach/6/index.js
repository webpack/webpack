import { value, readAsync } from "./branch";

it("should restore cached dependencies after every reattachment", async () => {
	expect(value).toBe(Number(WATCH_STEP));
	expect(await readAsync()).toBe(Number(WATCH_STEP));
});
