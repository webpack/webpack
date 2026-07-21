// `webpackFetchPriority` rides on the runtime `ensureChunk(id, priority)` call.
export const load = () =>
	import(/* webpackFetchPriority: "high" */ "./async").then((m) => m.value);
