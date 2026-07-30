import { disposed } from "./using.js";

// Read at evaluation time of this module: the imported module must already have
// disposed its top-level resource.
export const disposedAfterImport = disposed;
