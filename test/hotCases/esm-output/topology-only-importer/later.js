import store from "./store";

store.later = 1;
import.meta.webpackHot.accept();
---
import store from "./store";
import lateDep from "./late-dep";

store.later = lateDep;
import.meta.webpackHot.accept();
