import inner from "./inner";

export default "ok1" + inner;
---
export default "ok2";
---
import inner from "./inner";

export default "ok3" + inner;
