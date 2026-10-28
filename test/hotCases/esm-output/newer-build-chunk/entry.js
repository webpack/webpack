import.meta.webpackHot.accept();
---
import store from "./store";

store.pending = import(/* webpackChunkName: "page" */ "./page").then((m) => {
	store.value = m.default;
});
import.meta.webpackHot.accept();
---
import store from "./store";

store.pending = import(/* webpackChunkName: "page" */ "./page").then((m) => {
	store.value = m.default;
});
import.meta.webpackHot.accept();
