// Service theke controller-e status code shoho error pathanor jonno
export class ServiceError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}
//# sourceMappingURL=service-error.util.js.map