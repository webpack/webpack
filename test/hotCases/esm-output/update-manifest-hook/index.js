import update from "../../update.esm";
import value from "./value";

let seen;
__webpack_require__.hmrC.test = (
	chunkIds,
	removedChunks,
	removedModules,
	promises,
	applyHandlers,
	updatedModulesList,
	update
) => {
	seen = update.custom;
};

import.meta.webpackHot.accept("./value");

it("should pass a field a plugin added to the manifest to every download handler", (done) => {
	expect(value).toBe(1);
	NEXT(
		update(done, true, () => {
			expect(value).toBe(2);
			expect(seen).toEqual(["main"]);
			done();
		})
	);
});
