// Sharing modules requires that all remotes are initialized
// and can provide shared modules to the common scope
// As this is an async operation we need an async boundary (import())

// Using modules from remotes is also an async operation
// as chunks need to be loaded for the code of the remote module
// This also requires an async boundary (import())

// At this point shared modules initialized and remote modules are loaded
import("./bootstrap");

// It's possible to place more code here to do stuff on page init
// but it can't use any of the shared modules or remote modules.
