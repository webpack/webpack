import head from "./head.html";
import leader from "./leader.html";

it("should export both pages", () => {
	expect(head).toContain("<noscript>");
	expect(leader).toContain("<noscript>");
});
