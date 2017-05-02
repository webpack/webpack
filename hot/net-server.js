var fs = require('fs');
var net = require('net');
var port = typeof __resourceQuery === 'string' && __resourceQuery ?
    __resourceQuery.substr(1) :
    3567;

if(module.hot) {
  var lastHash = null;

  function upToDate() {
    return lastHash === __webpack_hash__;
  }

  var client = net.Socket();
  client.connect(port);
  console.log('[HMR] Connected');

  client.on('data', function(data) {
    lastHash = data.toString();

    if(!upToDate() && module.hot.status() === 'idle') {
      check();
    }
  });

  function check() {
    module.hot.check(function(err, updatedModules) {
      if(err) {
        console.log('[HMR] Error: ' + err);
        return;
      }

      if(!updatedModules) {
        return;
      }

      module.hot.apply({
        ignoreUnaccepted: true
      }, function(err, renewedModules) {
        if(!upToDate()) {
          check();
        }

        require("./log-apply-result")(updatedModules, renewedModules);
      });
    });
  }
}
else {
  throw new Error("[HMR] Hot Module Replacement is disabled.");
}
