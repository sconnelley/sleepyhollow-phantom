
var EventEmitter = require('./EventEmitter.js');

var stderr = require('system').stderr;
var stdin = require('system').stdin;

(function(window) {
    // setting off some issues, I don't care to figure out
    //"use strict";

    function sleepyhollow() {

        // the modified event-emitter bridge
        var sleepyhollow = new EventEmitter();

        // add `var`
        var _emit = sleepyhollow.emit;

        // each message will get it's own ID
        var msgId = 0;

        // couldn't overwrite `read-only` property
        // again don't care to figure it out
        sleepyhollow.emitt = function(event, message) {
            if (!message) message = " ";
            msgId++;

            // local emit, for other subscribers
            _emit.apply(sleepyhollow, Array.prototype.slice.call(arguments, 0));

            // if this event is an ack, bolt
            if (event == "ack") return;

            // experiments show that 4096 is the only safe MTU
            // stringify and chunk out writes
            JSON.stringify(message)
                .match(/.{1,4096}/g)
                .forEach(function(message, index, arr) {
                    write({
                        msgId: msgId,
                        // if there is more than one index, it's multipart
                        isMultipart: arr.length > 1,
                        // EOF there are no more indicies left to pass
                        isEOF: (index == arr.length - 1),
                        event: event,
                        message: message
                    });
                });
        }

        sleepyhollow.emit = function(event, message) {
            if (!message) message = " ";
            msgId++;

            // local emit, for other subscribers
            _emit.apply(sleepyhollow, Array.prototype.slice.call(arguments, 0));

            // if this event is an ack, bolt
            if (event == "ack") return;

            // experiments show that 4096 is the only safe MTU
            // stringify and chunk out writes
            JSON.stringify(message)
                .match(/.{1,4096}/g)
                .forEach(function(message, index, arr) {
                    write({
                        msgId: msgId,
                        // if there is more than one index, it's multipart
                        isMultipart: arr.length > 1,
                        // EOF there are no more indicies left to pass
                        isEOF: (index == arr.length - 1),
                        event: event,
                        message: message
                    });
                });
        }



        // custom write <> read bridge
        function write(obj) {
            stderr.write(JSON.stringify(obj) + "\n");
            if (obj.event !== "ack") read();
        }

        function read() {
            var data = stdin.readLine();
            try { data.split("\v").forEach(_read); }
            catch (e) { throw new Error(data); }
        }

        function _read(data) { return _readLine(JSON.parse(data)); }
        function _readLine(obj) {
            if (obj.event !== "ack") write({ event: "ack", message: obj });
            _emit.apply(sleepyhollow, [obj.event, obj.message]);
        }

        // minimal writing to make sure the Node side doesn't have to buffer
        setInterval(function() { write({ "event" : "syn" }); }, 1e3);

        return sleepyhollow;
    }

    module.exports = sleepyhollow;

})(this);