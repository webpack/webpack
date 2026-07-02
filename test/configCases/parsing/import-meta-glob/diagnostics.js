const pattern = "./missing/*.js";

import.meta.glob();
import.meta.glob(pattern);
import.meta.glob("./missing/*.js", null);
import.meta.glob([]);
import.meta.glob(["./missing/*.js", pattern]);
import.meta.glob("./missing/*.js", { eager: "true" });
import.meta.glob("./missing/*.js", { import: 1 });
import.meta.glob("./missing/*.js", { query: { foo: {} } });
import.meta.glob("./missing/*.js", { base: 1 });
import.meta.glob("./missing/*.js", { exhaustive: "true" });
import.meta.glob("./missing/*.js", { as: "raw" });
import.meta.glob("./missing/*.js", { caseSensitive: true });
import.meta.glob("./missing/*.js", { eager: true, import: "default" });
