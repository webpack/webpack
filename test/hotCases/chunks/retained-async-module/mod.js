import store from "./store";

store.value = 1;
module.hot.accept();
---
import store from "./store";

store.value = 1;
module.hot.accept();
---
import store from "./store";

store.value = 3;
module.hot.accept();
