import { double } from "./helper";

// Reassigns the public path, so nothing in this entry's runtime can bake a literal —
// even though concatenation absorbs the module that reassigns it.
__webpack_public_path__ = "/from-runtime/";

export const load = () => import("./overriding-lazy");
export const n = double(21);
