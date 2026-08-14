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

it("should bake the analyzable import into the lazy compilation proxy", (done) => {
	expect(message).toBe("original");

	const promise = import("./lazy-module");

	NEXT_DEFERRED(
		update(done, true, () => {
			promise
				.then((lazy) => {
					expect(lazy.value).toBe("lazy");

					// Needles are built at runtime so they are not source string literals here.
					const require_ = "__webpack_require__";
					// The proxy only names a chunk once the module is activated, so the
					// import lands in the update it is rebuilt into.
					const chunks = proxyChunks();
					expect(
						chunks.filter((chunk) => chunk.includes(`${require_}.ei(`))
					).not.toHaveLength(0);
					expect(
						chunks.filter((chunk) => chunk.includes(`${require_}.e(`))
					).toHaveLength(0);
					done();
				})
				.catch(done);
		})
	);
});
