const requestContext = require("../request-context");
const { v4 } = require("uuid");

function getHeaderName(config) {
    if (!config.requestId || !config.requestId.header) {
        return "x-request-id";
    }

    return config.requestId.header;
}

module.exports = (config, req, res, next) => {
    const header = getHeaderName(config);
    const id = req.headers[header] || v4();

    requestContext.set("requestId", id);
    res.set("x-request-id", id);

    next();
};
