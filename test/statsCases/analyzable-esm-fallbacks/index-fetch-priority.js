// `webpackFetchPriority` is unsupported for ESM output, so it must not degrade the
// output — the analyzable form is still emitted.
export const load = () =>
	import(/* webpackFetchPriority: "high" */ "./async").then((m) => m.value);
