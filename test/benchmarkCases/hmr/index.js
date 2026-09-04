import * as mod from "./generated/module.js";

export { mod };

if (import.meta.webpackHot) {
	import.meta.webpackHot.accept();
}
