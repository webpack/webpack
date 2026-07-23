// A runtime `__webpack_public_path__` assignment can't be baked into a literal.
__webpack_public_path__ = "/dynamic/";

export const load = () => import("./async").then((m) => m.value);
