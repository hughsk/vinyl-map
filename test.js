var concat = require('concat-stream')
var test = require('tape')
var File = require('vinyl')
var map = require('./')
var fs = require('fs')

test('null streams are just passed on', function(t) {
  var file = new File({
    contents: null
  })

  var stream = map(function(string) {
    t.fail('should not get called')
  })

  stream.once('end', function() {
    t.end()
  }).end(file)
})

test('buffer streams are passed a buffer', function(t) {
  var contents = fs.readFileSync(__filename)
  var file = new File({
    contents: contents
  })

  var stream = map(function(src) {
    t.ok(Buffer.isBuffer(src), 'Buffer.isBuffer(contents)')
    t.equal(String(contents), String(src), 'Buffer contents are correct')
  })

  stream.once('end', function() {
    t.end()
  }).end(file)
})

test('modifying buffer streams', function(t) {
  t.plan(5)

  var contents = fs.readFileSync(__filename)
  var file = new File({
    contents: contents
  })

  var stream = map(function(src) {
    t.ok(Buffer.isBuffer(src), 'Buffer.isBuffer(contents)')
    t.equal(String(contents), String(src), 'Buffer contents are correct')
    return String(src).toUpperCase()
  }).on('data', function(file) {
    t.ok(Buffer.isBuffer(file.contents), 'output contents are a buffer')
    t.equal(String(file.contents), String(contents).toUpperCase())
  })

  stream.once('end', function() {
    t.pass('Reached "end" event')
  }).end(file)
})

test('multiple buffers in a pipeline', function(t) {
  t.plan(9)

  var contents = fs.readFileSync(__filename)
  var file = new File({
    contents: contents
  })

  var stream = createStream()
  function createStream() {
    return map(function(src) {
      t.ok(Buffer.isBuffer(src), 'Buffer.isBuffer(contents)')
      t.equal(String(contents), String(src), 'Buffer contents are correct')
    })
  }

  stream
    .pipe(createStream())
    .pipe(createStream())
    .pipe(createStream())
    .once('end', function() {
      t.pass('reached stream "end" event')
    })

  stream.end(file)
})

test('stream streams cause an error to be emitted', function(t) {
  t.plan(3)

  var fileStream = fs.createReadStream(__filename)
  var contents = fs.readFileSync(__filename)
  var file = new File({
    contents: fileStream
  })

  var stream = map(function(src) {
    t.fail('mapped method called')
  }).on('error', function(error) {
    t.ok(error instanceof Error, 'error is an Error instance')
    t.ok(error.message === 'vinyl-map: This plugin does not support streams', 'error message is correct')
    t.pass('error emitted')
  }).end(file)
})

test('thrown errors in sync mapper get emitted as errors', function(t) {
  t.plan(2)

  var stream = map(function(src) {
    throw new Error('should be caught')
  }).on('error', function(err) {
    t.ok(err, 'error was caught and emitted')
  }).on('data', function() {
    t.fail('should not get emitted as "data"')
  })

  stream.write(new File({ contents: new Buffer(' ') }))
  stream.write(new File({ contents: new Buffer(' ') }))
  stream.end()
})
