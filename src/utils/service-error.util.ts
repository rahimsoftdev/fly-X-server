// Service theke controller-e status code shoho error pathanor jonno
export class ServiceError extends Error {
    statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
    }
}