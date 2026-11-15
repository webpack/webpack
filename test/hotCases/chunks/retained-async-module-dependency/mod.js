import store from "./store";

store.value = 1;
module.hot.accept();
---
import store from "./store";

store.value = 1;
module.hot.accept();
---
import store from "./store";
import dep from "./dep";

store.value = dep;
module.hot.accept();
