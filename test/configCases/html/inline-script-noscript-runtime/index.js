import head from "./head.html";
import leader from "./leader.html";
import early from "./early.html";

it("should export both pages", () => {
	expect(head).toContain("<noscript>");
	expect(leader).toContain("<noscript>");
	expect(early).toContain("<noscript>");
});
