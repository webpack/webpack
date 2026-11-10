import store from "./store";

store.later = 1;
module.hot.accept();
---
import store from "./store";
import lateDep from "./late-dep";

store.later = lateDep;
module.hot.accept();
