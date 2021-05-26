export default 0;
---
export default 1;
import "./module";
---
export default 2;
import "./module";
---
export default 3;
---
export default 4;
if (Math.random() < 0) import("./chunk");
---
export default 5;
if (Math.random() < 0) import("./chunk");
---
export default 6;
---
export default 7;
