import * as spaced from "./spaced.modules.css";

it("should read a request written as `:import (…)`, with a space", () => {
	expect(spaced).toEqual(nsObj({ "primary-color": "red" }));
});
