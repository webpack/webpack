// Importing a chunk that has a prefetch child must keep the runtime form, so the
// parent's `.f` prefetch handler still fires — the imported chunk can't be a literal.
export const load = () => import("./mid").then((m) => m.load());
