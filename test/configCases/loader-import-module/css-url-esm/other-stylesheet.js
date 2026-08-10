export default `body { background: url("${
	new URL(/* webpackPrefetch: true */ "./file.png", import.meta.url).href
}"); }`;
