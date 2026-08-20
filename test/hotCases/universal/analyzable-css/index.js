import update from "../../update.esm";

import.meta.webpackHot.accept("./style.module.css");

// A runtime carrying the hot handler keeps the runtime url form — the `css-chunk-href`
// config case pins that in the emitted source. What this drives is that an update still
// applies through it, with the stylesheet loaded on demand under module output.
it("should apply a stylesheet update under module output", (done) => {
	import("./style.module.css")
		.then(() => {
			NEXT(
				update(done, true, () => {
					import("./style.module.css")
						.then((updated) => {
							expect(updated).toMatchObject({
								"class-other": "style_module_css-class-other"
							});
							done();
						})
						.catch(done);
				})
			);
		})
		.catch(done);
});
