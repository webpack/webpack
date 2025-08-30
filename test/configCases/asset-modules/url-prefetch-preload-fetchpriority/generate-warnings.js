"use strict";

// This file is used to generate expected warnings during compilation

// Invalid fetchPriority value - should generate warning
const invalidPriorityUrl = new URL(/* webpackPrefetch: true */ /* webpackFetchPriority: "invalid" */ "./assets/images/priority-invalid.png", import.meta.url);

export default {};
