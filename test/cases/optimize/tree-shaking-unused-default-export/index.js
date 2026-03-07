import { opts } from "./intermediary";

it("should tree-shake unused default export when only named export is used", function() {
	expect(opts).toEqual({
		route: "/test",
		title: "I am a test"
	});
});

it("should still be accessible via dynamic import", function(done) {
	import("./intermediary").then(m => {
		expect(m.default).toBeDefined();
		expect(m.default.__processed).toBe(true);
		done();
	});
});
