import { x } from "./a";

it("should keep the statement end before an inlined export", () => {
	const f = () => () => "called";
	// ASI ends this statement, so `x` must not become an argument of `f()`
	let r = f()
	x.toString()
	expect(typeof r).toBe("function");
});
