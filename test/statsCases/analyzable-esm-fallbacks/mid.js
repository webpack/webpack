// Prefetching a grandchild gives this chunk a prefetch child, so the runtime `.f`
// prefetch handler must run when it loads — a native `import()` would bypass it.
export const load = () =>
	import(/* webpackPrefetch: true */ "./async").then((m) => m.value);
