const socket = socketClient(address)
/* istanbul ignore next */
socket.on('connect', function () {
  debug('Connected to ' + address)
})
