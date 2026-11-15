import store from "./store";

store.modRuns = (store.modRuns || 0) + 1;
module.hot.accept();
---
import store from "./store";

store.modRuns = (store.modRuns || 0) + 1;
module.hot.accept();
---
import store from "./store";
import "./dep";

store.modRuns = (store.modRuns || 0) + 1;
module.hot.accept();
---
import store from "./store";

store.modRuns = (store.modRuns || 0) + 1;
module.hot.accept();
---
import store from "./store";

store.modRuns = (store.modRuns || 0) + 1;
module.hot.accept();
