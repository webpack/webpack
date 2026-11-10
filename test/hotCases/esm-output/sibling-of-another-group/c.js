import store from "./store";

store.value = 1;
import.meta.webpackHot.accept();
---
import store from "./store";
import x from "./x";

store.value = x;
import.meta.webpackHot.accept();
