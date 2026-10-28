import store from "./store";

store.value = 1;
module.hot.accept();
---
import store from "./store";
import x from "./x";

store.value = x;
module.hot.accept();
