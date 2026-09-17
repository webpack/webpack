import { x, y } from "./dependency";

// `x` is referenced inside an inline `define` callback. Before the fix for #17063,
// `HarmonyDetectionParserPlugin` skipped walking the arguments of `define(...)` in
// ES modules, so the reference was never tracked and tree-shaking dropped it.
function useX() {
	define(function () {
		return x;
	});
}

// `callback` is a top-level function expression closing over `y`. innerGraph
// treats `y` as used only when `callback` is referenced at top level, and the only
// reference is `define(callback)` — which the buggy code also skipped.
const callback = function () {
	return y;
};

function useY() {
	define(callback);
}

export { useX, useY };
