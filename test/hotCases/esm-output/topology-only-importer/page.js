import store from "./store";

store.value = 1;
import.meta.webpackHot.accept();
---
import store from "./store";
import dep from "./dep";

store.value = dep;
import.meta.webpackHot.accept();
