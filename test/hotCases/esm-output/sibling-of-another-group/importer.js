export function loadA() {
	return import("./a");
}

export function loadB() {
	return import("./b");
}

import.meta.webpackHot.accept();
