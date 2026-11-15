import store from "./store";

store.value = 1;
import.meta.webpackHot.accept();
---
import store from "./store";
import shared from "./shared";

store.value = shared;
import.meta.webpackHot.accept();
