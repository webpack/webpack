export default function() {
	require.context(/* webpackChunkName: "ChunkName-[request]" */'./context', false, /chunk-[abc].js$/);
}
