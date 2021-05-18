import isomorphicFetch from "isomorphic-fetch";
import react from "react";
import reactDOM from "react-dom";

it("should be able to load the modules", () => {
	expect(isomorphicFetch).toBe("isomorphic-fetch");
	expect(react).toBe("react");
	expect(reactDOM).toBe("react-dom");
});

it("should have the correct modules in a lazy chunk", () => {
	const promise = import(/* webpackChunkName: "lazy" */ "./lazy").then(
		module => {
			module.default();
		}
	);
	__non_webpack_require__("./lazy.js");
	if (document.head._children[0]) document.head._children[0].onload();
	return promise;
});

import { value } from "test";

it("other-vendors should run too", () => {
	expect(value).toBe("ok");
});
