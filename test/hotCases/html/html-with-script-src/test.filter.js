"use strict";

// `<script src>` becomes its own chunk-loaded entry; the chunked-loading
// runtime that resolves those URLs is web-target only.
module.exports = (config) => config.target === "web";
