export default `body { background: url("${
	new URL("./file.png", import.meta.url).href
}"); }`;
