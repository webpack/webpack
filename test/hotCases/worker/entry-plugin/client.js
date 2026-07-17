// Injected into the worker entrypoint by WorkerEntryPlugin — stands in for the
// dev-server HMR client that drives `check()` from inside the worker.
self.__checkForUpdate = () => module.hot.check(true);
