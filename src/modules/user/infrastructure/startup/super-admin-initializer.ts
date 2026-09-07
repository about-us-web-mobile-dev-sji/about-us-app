import { Logger, OnApplicationBootstrap } from "@nestjs/common";
import { CreateSuperAdminUseCase } from "../../application/use-cases/create-super-admin/create-super-admin.usecase.js";


export class SuperAdminInitializer implements OnApplicationBootstrap {

    private readonly logger = new Logger(SuperAdminInitializer.name);

    constructor(
        private readonly createSuperAdminUseCase: CreateSuperAdminUseCase
    ) {}

    async onApplicationBootstrap(): Promise<void> {
        this.logger.log("Initializing super admin...");
        await this.createSuperAdminUseCase.handle();
        this.logger.log("Super admin initialization completed.");
    }

}