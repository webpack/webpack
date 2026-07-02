self.onmessage = () => {
	self.postMessage(self.__INJECTED_WORKER_ENTRY__);
};
