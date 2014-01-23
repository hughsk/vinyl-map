var concat  = require('concat-stream')
var through = require('through')
var from    = require('new-from')

module.exports = map

function map(fn) {
  var done = false
  var pending = 0
  var stream

  return stream = through(write, flush)

  function write(file) {
    if (typeof file !== 'object') return
    if (!('contents' in file)) return this.queue(file)

    if (file.isNull()) return this.queue(file)
    if (file.isBuffer()) return map(file)

    // should be a stream by
    // this point...
    pending++
    file.contents.pipe(concat(function(result) {
      map(file, result)
      check(--pending)
    }))
  }

  function map(file, contents) {
    file = file.clone()
    contents = arguments.length < 2
      ? file.contents
      : contents

    try {
      var mapped = fn(contents, file.path)
    } catch(err) {
      return stream.emit('error', err)
    }

    if (mapped === undefined) mapped = contents
    if (file.isBuffer()) file.contents = new Buffer(mapped)
    if (file.isStream()) file.contents = from([mapped])

    return stream.queue(file)
  }

  function flush() {
    check(done = true)
  }

  function check() {
    if (!pending && done) stream.queue(null)
  }
}
