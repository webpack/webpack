"use strict";

// This file is used to generate expected warnings during compilation

// Invalid fetchPriority value - should generate warning
const invalidPriorityUrl = new URL(/* webpackPrefetch: true */ /* webpackFetchPriority: "invalid" */ "./assets/images/priority-invalid.png", import.meta.url);

// Invalid preloadAs - should generate warning
const invalidPreloadAs = new URL(
  /* webpackPreload: true */
  /* webpackPreloadAs: "invalid-as" */
  "./assets/images/priority-invalid.png",
  import.meta.url
);

// Invalid preloadType (non-string) - should generate warning
const invalidPreloadType = new URL(
  /* webpackPreload: true */
  /* webpackPreloadType: 123 */
  "./assets/images/priority-invalid.png",
  import.meta.url
);

// Invalid preloadMedia (non-string) - should generate warning
const invalidPreloadMedia = new URL(
  /* webpackPreload: true */
  /* webpackPreloadMedia: 456 */
  "./assets/images/priority-invalid.png",
  import.meta.url
);

export default {};
