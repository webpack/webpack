import { color } from "./colors.js";
export default () =>
	`body { background: url("${
		new URL("./file.png", import.meta.url).href
	}"); color: ${color}; }`;

if (import.meta.webpackHot) {
	import.meta.webpackHot.accept("./colors.js");
}
---
import { color } from "./colors.js";
export default () =>
	`body { background: url("${
		new URL("./file.png", import.meta.url).href
	}"); color: ${color}; }`;

if (import.meta.webpackHot) {
	import.meta.webpackHot.accept("./colors.js");
}
---
import { color } from "./colors.js";
export default () =>
	`body { background: url("${
		new URL("./file.jpg", import.meta.url).href
	}"); color: ${color}; }`;

if (import.meta.webpackHot) {
	import.meta.webpackHot.accept("./colors.js");
}
