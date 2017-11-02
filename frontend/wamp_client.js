"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var WAMPClient = function () {
    function WAMPClient() {
        var _this = this;

        _classCallCheck(this, WAMPClient);

        this.WAMPConnection = null;
        this.WAMPSession = { isOpen: null };

        this.topicSubscriptions = {};

        this.commandQueue = [];
        this.commandQueueInterval = setInterval(function () {
            var commands = _this.commandQueue.slice(0);
            _this.commandQueue = [];

            commands.forEach(function (c) {
                _this.execute.apply(_this, [c[0]].concat(_toConsumableArray(c[1])));
            });
        }, 100);

        setTimeout(function () {
            clearInterval(_this.commandQueueInterval);
        }, 10000);

        this.connect();
    }

    _createClass(WAMPClient, [{
        key: "connect",
        value: function connect() {
            var _this2 = this;

            var URL = "ws://192.168.1.4:9999";

            this.WAMPConnection = new autobahn.Connection({
                url: URL,
                realm: "serpent",
                authmethods: ["wampcra"],
                authid: "client",
                onchallenge: this.onChallenge
            });

            this.WAMPConnection.onopen = function (session) {
                _this2.WAMPSession = session;
            };

            this.WAMPConnection.open();
        }
    }, {
        key: "execute",
        value: function execute(functionName) {
            for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
            }

            if (this.WAMPSession.isOpen) {
                this[functionName].apply(this, args);
            } else {
                this.commandQueue.push([functionName, args]);
            }
        }
    }, {
        key: "callRPC",
        value: function callRPC(endpoint, args, callback) {
            this.WAMPSession.call(endpoint, args).then(function (result) {
                callback(true, result);
            }, function (error) {
                callback(false, error);
            });
        }
    }, {
        key: "subscribe",
        value: function subscribe(topic, handler) {
            var _this3 = this;

            var match = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "exact";

            this.WAMPSession.subscribe(topic, handler, { match: match }).then(function (subscription) {
                _this3.topicSubscriptions[topic] = subscription;
            }, function (error) {
                console.error("Topic subscription error: " + error);
            });
        }
    }, {
        key: "unsubscribe",
        value: function unsubscribe(topic) {
            var _this4 = this;

            this.WAMPSession.unsubscribe(this.topicSubscriptions[topic]).then(function (gone) {
                delete _this4.topicSubscriptions[topic];
            }, function (error) {
                console.error("Topic unsubscription error: " + error);
            });
        }
    }, {
        key: "publish",
        value: function publish(topic, args, kwargs) {
            this.WAMPSession.publish(topic, args, kwargs, { acknowledge: true }).then(function (publication) {
                console.debug("Publish Acknowledged: " + publication);
            }, function (error) {
                console.error("Publish error: " + error);
            });
        }
    }, {
        key: "onChallenge",
        value: function onChallenge(session, method, extra) {
            if (method === "wampcra") {
                return autobahn.auth_cra.sign("12345", extra.challenge);
            }
        }
    }]);

    return WAMPClient;
}();