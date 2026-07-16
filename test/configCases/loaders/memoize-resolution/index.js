it("should memoize loader resolution without leaking per-module options", () => {
	const a = require("./a");
	const b = a.next;
	const c = b.next;
	const d = c.next;
	const e = d.next;
	const f = e.next;

	// a: first use of "echo-loader" (cache miss), plain, no options
	expect(a.query).toBe("");
	// b: reuses "echo-loader" (cache hit), still no options
	expect(b.query).toBe("");
	// c/d: reuse "echo-loader" (cache hit) but each keeps its own options
	expect(c.query).toEqual({ msg: "cc" });
	expect(d.query).toEqual({ msg: "dd" });
	// e: first use of aliased "query-loader" (cache miss), resolves with a query
	expect(e.query).toBe("?flag=on");
	// f: reuses "query-loader" (cache hit), query round-trips from the cache
	expect(f.query).toBe("?flag=on");
});
