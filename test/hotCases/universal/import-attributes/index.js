import data from "./data.json" with { type: "json" };
import text from "./payload.txt" with { type: "text" };
import bytes from "./payload.txt" with { type: "bytes" };
import update from "../../update.esm.js";

import.meta.webpackHot.accept(["./data.json"]);

it("should support typed imports (json/text/bytes) in a universal target", (done) => {
	expect(data.value).toBe("attr-1");
	expect(text).toBe("payload-text");
	expect(bytes.length).toBe(12);
	expect(bytes[0]).toBe("p".charCodeAt(0));

	NEXT(
		update(done, true, () => {
			import("./data.json", { with: { type: "json" } })
				.then((updated) => {
					expect(updated.default.value).toBe("attr-2");
					done();
				})
				.catch(done);
		})
	);
});
