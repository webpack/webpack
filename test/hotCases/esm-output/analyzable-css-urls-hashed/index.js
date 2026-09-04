import update from "../../update.esm";
import { load, loadMore } from "./styles";

const stylesheets = (name) =>
	[...document.getElementsByTagName("link")].filter(
		(link) =>
			link.rel === "stylesheet" &&
			new RegExp(`/${name}\\.[0-9a-f]+\\.css`).test(link.href)
	);

it("should bake hashed stylesheet urls and carry a moved one in the update", (done) => {
	load()
		.then(() => {
			expect(stylesheets("lazy_css")).toHaveLength(1);
			// The names settle before the runtime chunk, so the loader reads the map.
			const loader = __webpack_require__.f.css.toString();
			expect(loader).toContain("cssUrls[chunkId]()");
			expect(loader).not.toContain(".k(chunkId)");

			NEXT(
				update(done, true, () => {
					loadMore()
						.then(() => {
							// The map the update re-shipped spells the name the stylesheet has
							// now, so the loader attaches the updated one.
							const link = stylesheets("lazy2_css").find(
								(candidate) => !candidate.href.includes("?")
							);
							expect(link.sheet.css).toContain("orange");
							done();
						})
						.catch(done);
				})
			);
		})
		.catch(done);
});
