import update from "../../update.esm";
import { load } from "./styles";

import.meta.webpackHot.accept("./styles");

const hasStylesheet = (name) =>
	[...document.getElementsByTagName("link")].some(
		(link) => link.rel === "stylesheet" && link.href.endsWith(`/${name}`)
	);

it("should bake the stylesheet urls and follow a new one after an update", (done) => {
	load()
		.then(() => {
			expect(hasStylesheet("lazy_css.chunk.css")).toBe(true);
			// The loader reads the baked map rather than building a url from the id.
			const loader = __webpack_require__.f.css.toString();
			expect(loader).toContain("cssUrls[chunkId]()");
			expect(loader).not.toContain(".k(chunkId)");

			NEXT(
				update(done, true, () => {
					import("./styles")
						.then((updated) => updated.load())
						.then(() => {
							expect(hasStylesheet("lazy2_css.chunk.css")).toBe(true);
							done();
						})
						.catch(done);
				})
			);
		})
		.catch(done);
});
