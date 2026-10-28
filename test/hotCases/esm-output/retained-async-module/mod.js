import store from "./store";

store.value = 1;
import.meta.webpackHot.accept();
---
import store from "./store";

store.value = 1;
import.meta.webpackHot.accept();
---
import store from "./store";

store.value = 3;
import.meta.webpackHot.accept();
