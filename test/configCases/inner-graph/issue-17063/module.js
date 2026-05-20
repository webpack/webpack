import { x, y } from "./dependency";

// `x` is referenced inside an inline `define` callback. Without the fix
// for issue #17063, webpack's `HarmonyDetectionParserPlugin` skipped
// walking the arguments of `define(...)` calls in ES modules, so the
// reference to `x` would never be tracked and tree-shaking would drop
// it from `./dependency`.
function useX() {
	define(function () {
		return x;
	});
}

// `callback` is a top-level function expression that closes over `y`.
// innerGraph only treats `y` as used when `callback` itself is referenced
// at top level — and the only reference is via `define(callback)`, which
// the buggy code also skipped.
const callback = function () {
	return y;
};

function useY() {
	define(callback);
}

export { useX, useY };
