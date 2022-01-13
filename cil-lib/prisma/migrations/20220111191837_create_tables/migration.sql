-- CreateEnum
CREATE TYPE "Status" AS ENUM ('QUEUED', 'PROCESSED');

-- CreateTable
CREATE TABLE "validation_organizations" (
    "client_uuid" UUID NOT NULL,
    "kl_uuid" UUID NOT NULL,
    "role_uuids" UUID[],
    "program_uuids" UUID[],
    "status" "Status" NOT NULL DEFAULT E'QUEUED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "validation_organizations_pkey" PRIMARY KEY ("client_uuid")
);

-- CreateTable
CREATE TABLE "validation_schools" (
    "client_uuid" UUID NOT NULL,
    "client_org_uuid" UUID NOT NULL,
    "program_uuids" UUID[],
    "kl_uuid" UUID,
    "status" "Status" NOT NULL DEFAULT E'QUEUED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "validation_schools_pkey" PRIMARY KEY ("client_uuid")
);

-- CreateTable
CREATE TABLE "validation_classes" (
    "client_uuid" UUID NOT NULL,
    "client_org_uuid" UUID NOT NULL,
    "client_school_uuid" UUID NOT NULL,
    "kl_uuid" UUID,
    "status" "Status" NOT NULL DEFAULT E'QUEUED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "validation_classes_pkey" PRIMARY KEY ("client_uuid")
);

-- CreateTable
CREATE TABLE "validation_users" (
    "client_uuid" UUID NOT NULL,
    "client_org_uuid" UUID NOT NULL,
    "client_school_uuid" UUID NOT NULL,
    "kl_uuid" UUID,
    "status" "Status" NOT NULL DEFAULT E'QUEUED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "validation_users_pkey" PRIMARY KEY ("client_uuid")
);

-- CreateIndex
CREATE UNIQUE INDEX "validation_organizations_kl_uuid_key" ON "validation_organizations"("kl_uuid");

-- CreateIndex
CREATE INDEX "validation_organizations_kl_uuid_idx" ON "validation_organizations"("kl_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "validation_schools_kl_uuid_key" ON "validation_schools"("kl_uuid");

-- CreateIndex
CREATE INDEX "validation_schools_kl_uuid_idx" ON "validation_schools"("kl_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "validation_classes_kl_uuid_key" ON "validation_classes"("kl_uuid");

-- CreateIndex
CREATE INDEX "validation_classes_kl_uuid_idx" ON "validation_classes"("kl_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "validation_users_kl_uuid_key" ON "validation_users"("kl_uuid");

-- CreateIndex
CREATE INDEX "validation_users_kl_uuid_idx" ON "validation_users"("kl_uuid");

-- AddForeignKey
ALTER TABLE "validation_schools" ADD CONSTRAINT "validation_schools_client_org_uuid_fkey" FOREIGN KEY ("client_org_uuid") REFERENCES "validation_organizations"("client_uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_classes" ADD CONSTRAINT "validation_classes_client_org_uuid_fkey" FOREIGN KEY ("client_org_uuid") REFERENCES "validation_organizations"("client_uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_classes" ADD CONSTRAINT "validation_classes_client_school_uuid_fkey" FOREIGN KEY ("client_school_uuid") REFERENCES "validation_schools"("client_uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_users" ADD CONSTRAINT "validation_users_client_org_uuid_fkey" FOREIGN KEY ("client_org_uuid") REFERENCES "validation_organizations"("client_uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_users" ADD CONSTRAINT "validation_users_client_school_uuid_fkey" FOREIGN KEY ("client_school_uuid") REFERENCES "validation_schools"("client_uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
