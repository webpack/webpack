import(/* webpackPrefetch: true */ "./dynamic.js");

export const main = "main";

it("library output should be accurate value", done => {
	expect(global.lib.main).toBe("main");
	done();
});
