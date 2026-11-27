async <T>(fn: () => T);

// This looks A LOT like an async arrow function, but it isn't because
// T + U isn't a valid type parameter.
(async <T + U>(fn: T): T => fn);
