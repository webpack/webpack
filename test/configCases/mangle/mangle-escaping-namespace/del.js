import * as ns from "./del-enums";

// The whole namespace object escapes (kept mangleable + materialized)...
export const getDelNs = () => ns;

// ...while non-existent members are deleted on it. With mangling on, the access
// must stay a qualified property access, never a bare `delete undefined` (which
// is a SyntaxError in strict/ESM mode).
export function delMissing() {
	return [delete ns.MISSING, delete ns.alsoMissing];
}
