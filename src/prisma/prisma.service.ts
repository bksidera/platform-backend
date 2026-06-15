import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    async onModuleInit() {
        try {
            await this.$connect();
        } catch (error) {
            // Handle the error here
            console.error('Error connecting to Prisma:', error);
        }
    }

    async enableShutdownHooks(app: INestApplication) {
        // this.$on(this.$disconnect,async () => {
        await app.close();
        // });
    }
}
