// This file is used to generate expected warnings during compilation

// Invalid fetchPriority value - should generate warning
const invalidPriorityUrl = new URL(/* webpackPrefetch: true */ /* webpackFetchPriority: "invalid" */ "./assets/images/priority-invalid.png", import.meta.url);

// Both prefetch and preload specified - should generate warning
const bothHintsUrl = new URL(/* webpackPrefetch: true */ /* webpackPreload: true */ /* webpackFetchPriority: "high" */ "./assets/images/both-hints.png", import.meta.url);

export default {};