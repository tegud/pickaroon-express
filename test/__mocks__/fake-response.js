const EventEmitter = require("events");
module.exports = class FakeResponse extends EventEmitter {
    constructor(responseInfo) {
        super();
        this.statusCode = responseInfo.statusCode;
        this.headers = responseInfo.headers || {};
        if (responseInfo.location) {
            this.headers.location = responseInfo.location;
        }
    }

    get(header) {
        return this.headers[header];
    }

    set(header, value) {
        return (this.headers[header] = value);
    }
};
