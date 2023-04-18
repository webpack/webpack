import * as a from './a.common.js'

it("should load startup chunk dependency a.common.js", () => {
	expect(a.loaded).toBe(true);
});
