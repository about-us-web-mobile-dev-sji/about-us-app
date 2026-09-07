import { registerAs } from "@nestjs/config";

export default registerAs("super-admin", () => ({

  password: process.env.SUPER_ADMIN_PASSWORD,

  email: process.env.SUPER_ADMIN_EMAIL ,

  firstName: process.env.SUPER_ADMIN_FIRST_NAME,

  lastName: process.env.SUPER_ADMIN_LAST_NAME,
}));