// from https://github.com/mafintosh/why-is-node-running

var asyncHooks = require('async_hooks')
var stackback = require('stackback')
var path = require('path')
var fs = require('fs')
var sep = path.sep

var active = new Map()
var hook = asyncHooks.createHook({
  init (asyncId, type) {
    if (type === 'TIMERWRAP') return
    if (type === 'PROMISE') return
    var err = new Error('whatevs')
    var stacks = stackback(err)
    active.set(asyncId, {type, stacks})
  },
  destroy (asyncId) {
    active.delete(asyncId)
  }
})

hook.enable()
module.exports = whyIsNodeRunning

function whyIsNodeRunning (logger) {
  if (!logger) logger = console

  hook.disable()
  logger.error('There are %d handle(s) keeping the process running', active.size)
  for (const o of active.values()) printStacks(o)

  function printStacks (o) {
    var stacks = o.stacks.slice(1).filter(function (s) {
      var filename = s.getFileName()
      return filename && filename.indexOf(sep) > -1 && filename.indexOf('internal' + sep) !== 0
    })

    logger.error('')
    logger.error('# %s', o.type)

    if (!stacks[0]) {
      logger.error('(unknown stack trace)')
    } else {
      var padding = ''
      stacks.forEach(function (s) {
        var pad = (s.getFileName() + ':' + s.getLineNumber()).replace(/./g, ' ')
        if (pad.length > padding.length) padding = pad
      })
      stacks.forEach(function (s) {
        var prefix = s.getFileName() + ':' + s.getLineNumber()
        try {
          var src = fs.readFileSync(s.getFileName(), 'utf-8').split(/\n|\r\n/)
          logger.error(prefix + padding.slice(prefix.length) + ' - ' + src[s.getLineNumber() - 1].trim())
        } catch (e) {
          logger.error(prefix + padding.slice(prefix.length))
        }
      })
    }
  }
}
