import { message } from "./module.js";
import update from "../../update.esm";

const proxyChunks = () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	return fs
		.readdirSync(__dirname)
		.filter((file) => file.includes("lazy-compilation-proxy"))
		.map((file) => fs.readFileSync(path.join(__dirname, file), "utf-8"));
};

import.meta.webpackHot.accept(["./module.js"]);

it("should load a chunk the lazy compilation proxy creates after the build", (done) => {
	expect(message).toBe("original");

	const promise = import("./lazy-module");

	NEXT_DEFERRED(
		update(done, true, () => {
			promise
				.then((lazy) => {
					expect(lazy.value).toBe("lazy");

					// Needles are built at runtime so they are not source string literals here.
					const require_ = "__webpack_require__";
					// The loader's map is fixed when the build runs, so a chunk the proxy
					// creates after it is loaded by id through the runtime form instead.
					const chunks = proxyChunks();
					expect(
						chunks.filter((chunk) => chunk.includes(`${require_}.e(`))
					).not.toHaveLength(0);
					done();
				})
				.catch(done);
		})
	);
});
