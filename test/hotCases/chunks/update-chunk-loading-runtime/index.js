import value from "vendor";
// if (import.meta.webpackHot.data) throw new Error("Should not be executed again");
it("should correctly self-accept an entrypoint when chunk loading runtime module is updated", done => {
	const hash = __webpack_hash__;
	expect(value).toBe(1);
	let hmrData;
	import.meta.webpackHot.dispose(data => {
		hmrData = data;
	});
	NEXT(
		require("../../update")(done, true, () => {
			expect(hmrData).toHaveProperty("ok", true);
			hmrData.test();
			expect(hmrData.hash).not.toBe(hash);
			hmrData.loadChunk().then(m => {
				expect(m.default).toBe(42);
				done();
			}, done);
		})
	);
});
import.meta.webpackHot.accept();
---
import value from "vendor";
import.meta.webpackHot.data.ok = true;
import.meta.webpackHot.data.loadChunk = () => import("./chunk");
import.meta.webpackHot.data.test = () => {
	expect(value).toBe(2);
};
import.meta.webpackHot.data.hash = __webpack_hash__;
