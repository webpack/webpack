import(/* webpackChunkName: "c" */"./module-c");
import("./module-x"); // This should not create a chunk, because module-x is in both entrypoints (in every path to this module-b)
