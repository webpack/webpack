// Prefetching a grandchild gives this chunk a prefetch child, so the `.f.prefetch`
// handler must run when it loads — `.ei` dispatches it alongside the literal import.
export const load = () =>
	import(/* webpackPrefetch: true */ "./async").then((m) => m.value);
