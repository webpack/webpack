export let active = true;

import.meta.webpackHot.dispose(() => {
	active = false;
});
