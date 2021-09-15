import a from "./a";
import get from "./b";

var options = { ignoreUnaccepted: true };

it("should ignore unaccepted module updates", (done) => {
	function waitForUpdate(fn) {
		NEXT(require("../../update")(done, options, fn));
	}

	expect(a).toBe(2);
	expect(get()).toBe(1);
	waitForUpdate(() => {
		expect(a).toBe(2);
		expect(get()).toBe(1);
		waitForUpdate(() => {
			expect(a).toBe(2);
			expect(get()).toBe(2);
			waitForUpdate(() => {
				expect(a).toBe(2);
				expect(get()).toBe(3);
				done();
			});
		});
	});
});
