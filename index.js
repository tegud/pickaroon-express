const requestLogger = require("./lib/request-logger");

const availableMiddlewares = {
    dynamicLogLevel: "./lib/dynamic-log-level",
    requestId: "./lib/request-id",
    requestInfo: "./lib/request-info"
};

module.exports = function(logger, config = {}) {
    const middlewares = [];

    const api = Object.keys(availableMiddlewares).reduce(
        (theApi, property) => {
            theApi[property] = () => {
                middlewares.push(require(availableMiddlewares[property]));

                return api;
            };

            return theApi;
        },
        {
            setMiddleware: app => {
                [
                    requestLogger.bind(undefined, logger, config),
                    ...middlewares.map(middleware =>
                        middleware.bind(undefined, config)
                    )
                ].forEach(middleware => app.use(middleware));
            }
        }
    );

    return api;
};
