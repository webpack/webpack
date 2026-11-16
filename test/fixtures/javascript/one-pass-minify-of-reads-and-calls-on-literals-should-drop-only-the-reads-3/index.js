var log = [], o = { p: {} }; function f() { log.push("f"); return o; } f().p; f().p.q; (log.length > 1 ? f() : null).p; console.log(log.join());
