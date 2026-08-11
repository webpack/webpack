// Reassigns the public path, so nothing in this entry's runtime can bake a literal.
__webpack_public_path__ = "/from-runtime/";

export const load = () => import("./overriding-lazy");
