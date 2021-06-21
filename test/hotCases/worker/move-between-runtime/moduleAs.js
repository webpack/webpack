export default 0;
---
export default 1;
import "./moduleS";
---
export default 2;
import "./moduleS";
---
export default 3;
---
export default 4;
if (Math.random() < 0) import("./chunkS");
---
export default 5;
if (Math.random() < 0) import("./chunkS");
---
export default 6;
---
export default 7;
