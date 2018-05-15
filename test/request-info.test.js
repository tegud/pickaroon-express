const requestInfo = require("../lib/request-info");
const requestContext = require("../request-context");

const FakeLogger = require("./__mocks__/fake-logger");
const FakeRequest = require("./__mocks__/fake-request");
const FakeResponse = require("./__mocks__/fake-response");

describe("Request Info", () => {
    describe("request body fields", () => {
        test("are included if present", done => {
            const fakeLogger = new FakeLogger();
            const fakeResponse = new FakeResponse({
                statusCode: 200
            });
            const fakeRequest = new FakeRequest({});

            fakeRequest.body.field_a = 12345;
            fakeRequest.body.field_b = "abcde";

            const context = requestContext.context();

            context.run(() => {
                requestInfo(
                    {
                        requestInfo: {
                            fields: [
                                "request.body.field_a",
                                "request.body.field_b",
                                "request.body.field_c"
                            ]
                        }
                    },
                    fakeRequest,
                    fakeResponse,
                    () => {
                        expect(requestContext.get().data).toEqual({
                            field_a: 12345,
                            field_b: "abcde"
                        });

                        done();
                    }
                );
            });
        });

        test("are not included if body is not present", done => {
            const fakeLogger = new FakeLogger();
            const fakeResponse = new FakeResponse({
                statusCode: 200
            });
            const fakeRequest = new FakeRequest({});
            delete fakeRequest.body;

            const context = requestContext.context();

            context.run(() => {
                requestInfo(
                    {
                        requestInfo: {
                            fields: [
                                "request.body.field_a",
                                "request.body.field_b",
                                "request.body.field_c"
                            ]
                        }
                    },
                    fakeRequest,
                    fakeResponse,
                    () => {
                        expect(requestContext.get().data).toEqual({});

                        done();
                    }
                );
            });
        });
    });

    describe("request header fields", () => {
        test("are included if present", done => {
            const fakeLogger = new FakeLogger();
            const fakeResponse = new FakeResponse({
                statusCode: 200
            });
            const fakeRequest = new FakeRequest({
                headers: {
                    "x-header-1": 12345
                }
            });

            const context = requestContext.context();

            context.run(() => {
                requestInfo(
                    {
                        requestInfo: {
                            fields: [
                                "request.headers.x-header-1",
                                "request.headers.x-header-2"
                            ]
                        }
                    },
                    fakeRequest,
                    fakeResponse,
                    () => {
                        expect(requestContext.get().data).toEqual({
                            "x-header-1": 12345
                        });

                        done();
                    }
                );
            });
        });
    });

    describe("response header fields", () => {
        test("are included if present", done => {
            const fakeLogger = new FakeLogger();
            const fakeResponse = new FakeResponse({
                statusCode: 200,
                headers: {
                    "x-header-1": 12345
                }
            });
            const fakeRequest = new FakeRequest({});

            const context = requestContext.context();

            context.run(() => {
                requestInfo(
                    {
                        requestInfo: {
                            fields: [
                                "response.headers.x-header-1",
                                "response.headers.x-header-2"
                            ]
                        }
                    },
                    fakeRequest,
                    fakeResponse,
                    () => {
                        expect(requestContext.get().data).toEqual({
                            "x-header-1": 12345
                        });

                        done();
                    }
                );
            });
        });
    });

    test("does not log fields when no config specified", done => {
        const fakeLogger = new FakeLogger();
        const fakeResponse = new FakeResponse({
            statusCode: 200
        });
        const fakeRequest = new FakeRequest({});
        delete fakeRequest.body;

        const context = requestContext.context();

        context.run(() => {
            requestInfo({}, fakeRequest, fakeResponse, () => {
                expect(requestContext.get().data).toEqual({});

                done();
            });
        });
    });
});
