// Transpiled by babel-loader; worker chunk is not a runtime chunk, so it can appear as "other"
// in getAllReferencedAsyncEntrypoints() while building the runtime chunk dependency graph.
// Without the fix, runtimeChunksMap.get(other) is undefined and otherInfo.referencedBy.push(info) crashes.
onmessage = event => {
	postMessage(event.data === "ping" ? "pong" : "unexpected");
};
