import * as ns from "./dep";

function withCallback(ns) {
	return ns();
}

it("should leave a shadowed namespace name alone", () => {
	expect(ns.value).toBe(1);
	expect(withCallback(() => "fine")).toBe("fine");
	expect(__STATS__.warnings).toHaveLength(0);
});
