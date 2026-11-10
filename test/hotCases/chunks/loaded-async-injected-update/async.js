import store from "./store";

store.value = 1;
module.hot.accept();
---
import store from "./store";
import shared from "./shared";

store.value = shared;
module.hot.accept();
---
import store from "./store";
import shared from "./shared";

store.value = shared;
module.hot.accept();
