var through = require('through2')
var from    = require('new-from')
var bl      = require('bl')

module.exports = map

function map(fn) {
  var done = false
  var pending = 0
  var stream

  return stream = through.obj(write, flush)

  function write(file, _, next) {
    if (typeof file !== 'object') return
    if (!('contents' in file)) return push(file, next)

    if (file.isNull()) return push(file, next)
    if (file.isBuffer()) return map(file, next)

    // should be a stream by
    // this point...
    pending++
    file.contents.pipe(bl(function(err, result) {
      if (err) return stream.emit('error', err)
      map(file, next, result)
      check(--pending)
    }))
  }

  function postMap(file, next, contents, mapped) {
    if (mapped === undefined) mapped = contents
    if (file.isBuffer()) file.contents = new Buffer(mapped)
    if (file.isStream()) file.contents = from([mapped])

    push(file, next)
  }

  function map(file, next, contents) {
    file = file.clone()
    contents = arguments.length < 3
      ? file.contents
      : contents

    if (fn.length === 3) {
      // contents, filename, done (async)
      fn(contents, file.path, function(err, mapped) {
        if (err) stream.emit('error', err)
        else postMap(file, next, contents, mapped)
      })
    } else {
      // contents and/or filename (sync)
      try {
        var mapped = fn(contents, file.path)
      } catch(err) {
        return stream.emit('error', err)
      }

      postMap(file, next, contents, mapped)
    }
  }

  function push(file, next) {
    stream.push(file)
    next()
  }

  function flush() {
    check(done = true)
  }

  function check() {
    if (!pending && done) {
      process.nextTick(function() {
        stream.emit('end')
        process.nextTick(function() {
          stream.emit('close')
        })
      })
    }
  }
}
