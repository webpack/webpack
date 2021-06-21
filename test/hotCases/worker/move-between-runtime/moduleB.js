export default 0;
---
export default 1;
---
export default 2;
import "./module";
---
export default 3;
import "./module";
---
export default 4;
---
export default 5;
if (Math.random() < 0) import("./chunk");
---
export default 6;
if (Math.random() < 0) import("./chunk");
---
export default 7;
