export default `body { background: url("${
	new URL("./file.png", import.meta.url).href
}"); border-image: url("${
	new URL("./file.png?inline", import.meta.url).href
}"); }`;
