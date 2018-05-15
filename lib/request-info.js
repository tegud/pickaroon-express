const requestContext = require("../request-context");

const rootFunctions = {
    request: (category, property, req) =>
        req[category] ? req[category][property] : undefined,
    response: (category, property, req, res) => res.get(property)
};

module.exports = (config, req, res, next) => {
    if (!config.requestInfo) {
        return next();
    }

    config.requestInfo.fields.forEach(field => {
        const [root, category, property] = field.split(".");

        const value = rootFunctions[root](category, property, req, res);
        if (value) {
            requestContext.set(property, value);
        }
    });

    next();
};
