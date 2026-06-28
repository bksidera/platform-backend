/* eslint-disable prettier/prettier */
import { HttpStatus, Injectable } from '@nestjs/common';
import { Response } from 'express';
@Injectable()
export class ResponseService {
    constructor() { }
    async responseStructure(
        status: string,
        message: string,
        data: unknown,
        code: number,
        res: Response,
    ) {
        return res.status(code).json({
            status: status == "success",
            message: message,
            data: data || {},
        });
    }

    async FORBIDDED(message: string, res: Response) {
        return await this.responseStructure(
            "FORBIDDED",
            message,
            {},
            HttpStatus.FORBIDDEN,
            res
        );
    }
    async USER_NOT_FOUND(message: string, data: unknown, res: Response) {
        return await this.responseStructure(
            'USER_NOT_FOUND',
            message,
            data,
            HttpStatus.OK,
            res,
        );
    }

    async NOT_FOUND(message: string, data: unknown, res: Response) {
        return await this.responseStructure(
            'NOT_FOUND',
            message,
            data,
            HttpStatus.OK,
            res,
        );
    }

    async success(status: string, message: string, data: unknown, res: Response) {
        return await this.responseStructure(
            status,
            message,
            data,
            HttpStatus.OK,
            res,
        );
    }

    async NOT_FOUND_MESSAGE(loginType: string) {
        return `${loginType} DOES NOT EXIST`;
    }

    async noDataInput(message: string, data: unknown, res: Response) {
        return await this.responseStructure(
            'NO_INPUT_DATA',
            message,
            data,
            HttpStatus.OK,
            res,
        );
    }

    async notVerified(message: string, res: Response) {
        return await this.responseStructure(
            'NOT_VERIFIED',
            message,
            {},
            HttpStatus.OK,
            res,
        );
    }

    async incorrectData(message: string, res: Response) {
        return await this.responseStructure(
            'INCORRECT',
            message,
            {},
            HttpStatus.OK,
            res,
        );
    }

    async INTERNAL_SERVER_ERROR(message: string, data: unknown, res: Response) {
        return await this.responseStructure(
            'INTERNAL_SERVER_ERROR',
            message,
            data,
            HttpStatus.OK,
            res,
        );
    }

    async CONFLICT(status: string, res: Response) {
        return await this.responseStructure(
            `${status}_EXIST`,
            `${await this.WordToPascalCase(status)} Already Exist`,
            {},
            HttpStatus.OK,
            res,
        );
    }

    // status: string,
    // message: string,
    // data: unknown,
    // code: number,
    // res: Response,
    async CONFLICT_PRECISE(res: Response, status: string) {
        const massage = "Conflict: Precise Location already exists"
        return await this.responseStructure(
            status,
            massage,
            {},
            HttpStatus.OK,
            res
        )
    }

    async VERIFIED(message: string, res: Response) {
        return await this.responseStructure(
            'ALREADY_VERIFIED',
            message,
            {},
            HttpStatus.OK,
            res,
        );
    }

    async UNAUTHORIZED(message: string, res: Response) {
        return await this.responseStructure(
            'UNAUTHORIZED',
            message,
            {},
            HttpStatus.OK,
            res,
        );
    }

    async EXPIRED(message: string, res: Response) {
        return await this.responseStructure(
            'EXPIRED',
            message,
            {},
            HttpStatus.OK,
            res,
        );
    }

    // **New Method to Handle Bad Requests (400)**
    async BAD_REQUEST(message: string, data: unknown, res: Response) {
        return await this.responseStructure(
            'BAD_REQUEST',
            message,
            data,
            HttpStatus.BAD_REQUEST,
            res,
        );
    }

    // **New Method to Handle Too Many Requests (429)**
    async TOO_MANY_REQUESTS(message: string, data: unknown, res: Response) {
        return await this.responseStructure(
            'TOO_MANY_REQUESTS',
            message,
            data,
            HttpStatus.TOO_MANY_REQUESTS,
            res,
        );
    }
    private async WordToPascalCase(word: string) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
}
