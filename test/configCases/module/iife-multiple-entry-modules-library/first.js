var result = "side-effect";

// Keep `result` as a real top-level declaration so it collides with second.js's
// exported `result`; the branch never runs (Math.random is not statically known,
// so the declaration survives) and needs no global.
if (Math.random() < 0) {
	throw new Error(result);
}
