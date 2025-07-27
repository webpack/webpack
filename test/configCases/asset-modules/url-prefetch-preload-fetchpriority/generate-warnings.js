"use strict";

// This file is used to generate expected warnings during compilation

// Invalid fetchPriority value - should generate warning
const invalidPriorityUrl = new URL(/* webpackPrefetch: true */ /* webpackFetchPriority: "invalid" */ "./assets/images/priority-invalid.png", import.meta.url);

// Invalid webpackPreloadType value - should generate warning
const invalidTypeUrl = new URL(/* webpackPreload: true */ /* webpackPreloadType: 123 */ "./assets/styles/invalid-type.css", import.meta.url);

export default {};
