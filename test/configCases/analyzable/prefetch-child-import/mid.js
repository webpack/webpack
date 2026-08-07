// A prefetch child makes the runtime `.f.prefetch` handler matter for this chunk.
export const load = () =>
	import(/* webpackPrefetch: true */ "./grandchild").then((m) => m.value);
export const value = "mid";
