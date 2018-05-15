const dgram = require("dgram");
const express = require("express");
const request = require("request");
const moment = require("moment");
const Logger = require("pickaroon");
const bodyParser = require("body-parser");
const RequestLogger = require("../");
const RequestContext = require("../request-context");

function UdpServer(port) {
    const server = dgram.createSocket("udp4");

    const messageHandler = () => {};

    server.on("error", err => {
        console.log(`udp server error:\n${err.stack}`);
        server.close();
    });

    return {
        start: () => {
            server.bind(port);
            return Promise.resolve();
        },
        on: (...args) => server.on(...args),
        stop: () => {
            server.close();
            return Promise.resolve();
        }
    };
}

function makeRequest(options) {
    return new Promise(resolve =>
        request(options, (err, response, data) => {
            resolve({
                response,
                data
            });
        })
    );
}

describe("logall request middleware", () => {
    let server;
    let udpListener;
    let logger;

    function startServer(app, port) {
        return new Promise(resolve => {
            server = app.listen(port, error => {
                if (error) {
                    console.error("error starting http server", {
                        listening_port: port,
                        error
                    });
                }
                resolve();
            });
        });
    }

    function startUdpListener(port) {
        udpListener = new UdpServer(port);

        return udpListener.start();
    }

    afterEach(() => {
        server.close();
        logger.stop();
        moment.__reset();
        return udpListener.stop();
    });

    test("Logs to UDP when request is complete", done => {
        const app = express();
        const httpPort = 3000;
        const udpPort = 3001;

        moment.__setDate("2018-04-08T21:21:39+01:00");

        logger = new Logger();
        logger
            .removeLogger("default")
            .setLogLevel("INFO")
            .registerLogger("logstash", {
                name: "logstash",
                eventType: "my-api",
                protocol: "udp",
                host: "127.0.0.1",
                port: 3001,
                enabled: true
            });

        const requestLogger = new RequestLogger(logger);
        requestLogger.setMiddleware(app);
        app.get("/example", (req, res) => res.send("OK"));

        Promise.all([
            startServer(app, httpPort),
            startUdpListener(udpPort)
        ]).then(() =>
            makeRequest({ url: `http://localhost:${httpPort}/example` })
        );

        udpListener.on("message", message => {
            expect(JSON.parse(message.toString("utf-8"))).toEqual({
                "@timestamp": "2018-04-08T20:21:39.000Z",
                client_ip: "::ffff:127.0.0.1",
                level: "info",
                message: "Request Handled",
                method: "GET",
                status: 200,
                type: "my-api",
                url: "/example"
            });
            done();
        });
    });

    test("Dynamic log level logs DEBUG when level function indicates to", done => {
        const app = express();
        const httpPort = 3000;
        const udpPort = 3001;

        moment.__setDate("2018-04-08T21:21:39+01:00");

        logger = new Logger();
        logger
            .removeLogger("default")
            .setLogLevel("INFO")
            .registerLogger("logstash", {
                name: "logstash",
                eventType: "my-api",
                protocol: "udp",
                host: "127.0.0.1",
                port: 3001,
                enabled: true
            })
            .setLogLevel(
                "logstash",
                () => RequestContext.getValue("logLevel") || "info"
            );

        const requestLogger = new RequestLogger(logger);
        requestLogger.dynamicLogLevel().setMiddleware(app);

        app.get("/example", (req, res) => {
            logger.logDebug("DEBUG MESSAGE");
            res.send("OK");
        });

        Promise.all([
            startServer(app, httpPort),
            startUdpListener(udpPort)
        ]).then(() => {
            udpListener.on("message", message => {
                const parsedMessage = JSON.parse(message.toString("utf-8"));
                if (parsedMessage.level !== "debug") {
                    return;
                }

                expect(parsedMessage).toEqual({
                    "@timestamp": "2018-04-08T20:21:39.000Z",
                    type: "my-api",
                    level: "debug",
                    message: "DEBUG MESSAGE"
                });
                done();
            });

            makeRequest({
                url: `http://localhost:${httpPort}/example`,
                headers: {
                    "X-Log-Level": "DEBUG"
                }
            });
        });
    });

    test("RequestID is logged", done => {
        const app = express();
        const httpPort = 3000;
        const udpPort = 3001;

        moment.__setDate("2018-04-08T21:21:39+01:00");

        logger = new Logger();
        logger
            .removeLogger("default")
            .setLogLevel("INFO")
            .setFieldStandard("snake_case")
            .registerLogger("logstash", {
                name: "logstash",
                eventType: "my-api",
                protocol: "udp",
                host: "127.0.0.1",
                port: 3001,
                enabled: true
            });

        const requestLogger = new RequestLogger(logger);
        requestLogger.requestId().setMiddleware(app);
        app.get("/example", (req, res) => res.send("OK"));

        Promise.all([
            startServer(app, httpPort),
            startUdpListener(udpPort)
        ]).then(() =>
            makeRequest({
                url: `http://localhost:${httpPort}/example`,
                headers: { "x-request-id": "12345" }
            })
        );

        udpListener.on("message", message => {
            expect(JSON.parse(message.toString("utf-8"))).toEqual({
                "@timestamp": "2018-04-08T20:21:39.000Z",
                client_ip: "::ffff:127.0.0.1",
                level: "info",
                message: "Request Handled",
                method: "GET",
                status: 200,
                request_id: "12345",
                type: "my-api",
                url: "/example"
            });
            done();
        });
    });

    test("Logs to extended request and response info", done => {
        const app = express();
        const httpPort = 3000;
        const udpPort = 3001;

        moment.__setDate("2018-04-08T21:21:39+01:00");

        logger = new Logger();
        logger
            .removeLogger("default")
            .setLogLevel("INFO")
            .registerLogger("logstash", {
                name: "logstash",
                eventType: "my-api",
                protocol: "udp",
                host: "127.0.0.1",
                port: 3001,
                enabled: true
            });

        const requestLogger = new RequestLogger(logger, {
            requestInfo: {
                fields: ["request.body.user_id", "request.headers.x-session-id"]
            }
        })
            .requestInfo()
            .setMiddleware(app);
        app.post(
            "/example",
            bodyParser.urlencoded({ extended: true }),
            (req, res) => res.send("OK")
        );

        Promise.all([
            startServer(app, httpPort),
            startUdpListener(udpPort)
        ]).then(() =>
            makeRequest({
                url: `http://localhost:${httpPort}/example`,
                method: "POST",
                form: {
                    user_id: 12345
                },
                headers: {
                    "x-session-id": "abcde-999"
                }
            })
        );

        udpListener.on("message", message => {
            expect(JSON.parse(message.toString("utf-8"))).toEqual({
                "@timestamp": "2018-04-08T20:21:39.000Z",
                client_ip: "::ffff:127.0.0.1",
                level: "info",
                message: "Request Handled",
                method: "POST",
                status: 200,
                type: "my-api",
                url: "/example",
                user_id: 12345,
                session_id: "abcde-999"
            });
            done();
        });
    });
});
