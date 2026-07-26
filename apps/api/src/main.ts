import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix("api/v1");
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.get<string>("WEB_URL", "http://localhost:3000"),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("ClassConnect API")
    .setDescription(
      "Interactive documentation for ClassConnect administration, courses, attendance, assessments, grades, analytics, and reporting.",
    )
    .setVersion("1.0")
    .addServer("/api/v1", "Current server")
    .addCookieAuth("classconnect_access", {
      type: "apiKey",
      in: "cookie",
      description: "Access cookie returned by POST /auth/login",
    })
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, swaggerDocument, {
    customSiteTitle: "ClassConnect API Documentation",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      tryItOutEnabled: true,
      filter: true,
    },
  });

  await app.listen(config.get<number>("PORT", 4000));
}

void bootstrap();
