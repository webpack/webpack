require("./common").globalCheck = false;

try { require("./simple/test-assert.js");                               } catch(e) { window.test(false, "Node.js Test should not fail with " + e ); }
try { require("./simple/test-event-emitter-check-listener-leaks.js");   } catch(e) { window.test(false, "Node.js Test should not fail with " + e ); }
try { require("./simple/test-event-emitter-modify-in-emit.js");         } catch(e) { window.test(false, "Node.js Test should not fail with " + e ); }
try { require("./simple/test-event-emitter-num-args.js");               } catch(e) { window.test(false, "Node.js Test should not fail with " + e ); }
try { require("./simple/test-event-emitter-remove-all-listeners.js");   } catch(e) { window.test(false, "Node.js Test should not fail with " + e ); }
try { require("./simple/test-global.js");                               } catch(e) { window.test(false, "Node.js Test should not fail with " + e ); }
try { require("./simple/test-next-tick-doesnt-hang.js");                } catch(e) { window.test(false, "Node.js Test should not fail with " + e ); }
try { require("./simple/test-next-tick-ordering2.js");                  } catch(e) { window.test(false, "Node.js Test should not fail with " + e ); }
try { require("./simple/test-path.js");                                 } catch(e) { window.test(false, "Node.js Test should not fail with " + e ); }
try { require("./simple/test-querystring.js");                          } catch(e) { window.test(false, "Node.js Test should not fail with " + e ); }
try { require("./simple/test-sys.js");                                  } catch(e) { window.test(false, "Node.js Test should not fail with " + e ); }
try { require("./simple/test-timers-zero-timeout.js");                  } catch(e) { window.test(false, "Node.js Test should not fail with " + e ); }
try { require("./simple/test-timers.js");                               } catch(e) { window.test(false, "Node.js Test should not fail with " + e ); }
try { require("./simple/test-url.js");                                  } catch(e) { window.test(false, "Node.js Test should not fail with " + e ); }
try { require("./simple/test-util-format.js");                          } catch(e) { window.test(false, "Node.js Test should not fail with " + e ); }
try { require("./simple/test-util-inspect.js");                         } catch(e) { window.test(false, "Node.js Test should not fail with " + e ); }
try { require("./simple/test-util.js");                                 } catch(e) { window.test(false, "Node.js Test should not fail with " + e ); }

window.test(true, "Node.js simple tests should complete");

setTimeout(function() {
	process.emit("exit");
	window.test(true, "Node.js simple tests should complete on process exit");
}, 3000);