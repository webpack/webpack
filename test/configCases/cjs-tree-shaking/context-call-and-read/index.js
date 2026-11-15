import { readMap } from "./read";
import { callMap } from "./call";

const name = ["array"][0];

it("should not merge a context member read with a member call", async () => {
	expect(await readMap(name)).toBe("function");
	expect(await callMap(name)).toEqual(["MD", "MARKDOWN"]);
});
