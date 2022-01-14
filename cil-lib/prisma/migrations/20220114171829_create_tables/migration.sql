-- CreateEnum
CREATE TYPE "Status" AS ENUM ('QUEUED', 'PROCESSED');

-- CreateTable
CREATE TABLE "validation_organizations" (
    "external_uuid" UUID NOT NULL,
    "kl_uuid" UUID NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "validation_organizations_pkey" PRIMARY KEY ("external_uuid")
);

-- CreateTable
CREATE TABLE "validation_schools" (
    "external_uuid" UUID NOT NULL,
    "external_org_uuid" UUID NOT NULL,
    "program_uuids" UUID[],
    "kl_uuid" UUID,
    "status" "Status" NOT NULL DEFAULT E'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "request_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "validation_schools_pkey" PRIMARY KEY ("external_uuid")
);

-- CreateTable
CREATE TABLE "validation_classes" (
    "external_uuid" UUID NOT NULL,
    "external_org_uuid" UUID NOT NULL,
    "external_school_uuid" UUID NOT NULL,
    "kl_uuid" UUID,
    "status" "Status" NOT NULL DEFAULT E'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "request_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "validation_classes_pkey" PRIMARY KEY ("external_uuid")
);

-- CreateTable
CREATE TABLE "validation_users" (
    "external_uuid" UUID NOT NULL,
    "external_org_uuid" UUID NOT NULL,
    "external_school_uuid" UUID NOT NULL,
    "kl_uuid" UUID,
    "status" "Status" NOT NULL DEFAULT E'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "request_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "validation_users_pkey" PRIMARY KEY ("external_uuid")
);

-- CreateTable
CREATE TABLE "validation_roles" (
    "external_uuid" UUID NOT NULL,
    "name" VARCHAR(20) NOT NULL,
    "external_org_uuid" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "validation_roles_pkey" PRIMARY KEY ("external_uuid")
);

-- CreateTable
CREATE TABLE "validation_programs" (
    "external_uuid" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "external_org_uuid" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "validation_programs_pkey" PRIMARY KEY ("external_uuid")
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

-- CreateIndex
CREATE INDEX "validation_roles_name_external_org_uuid_idx" ON "validation_roles"("name", "external_org_uuid");

-- CreateIndex
CREATE INDEX "validation_programs_name_external_org_uuid_idx" ON "validation_programs"("name", "external_org_uuid");

-- AddForeignKey
ALTER TABLE "validation_schools" ADD CONSTRAINT "validation_schools_external_org_uuid_fkey" FOREIGN KEY ("external_org_uuid") REFERENCES "validation_organizations"("external_uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_classes" ADD CONSTRAINT "validation_classes_external_org_uuid_fkey" FOREIGN KEY ("external_org_uuid") REFERENCES "validation_organizations"("external_uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_classes" ADD CONSTRAINT "validation_classes_external_school_uuid_fkey" FOREIGN KEY ("external_school_uuid") REFERENCES "validation_schools"("external_uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_users" ADD CONSTRAINT "validation_users_external_org_uuid_fkey" FOREIGN KEY ("external_org_uuid") REFERENCES "validation_organizations"("external_uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_users" ADD CONSTRAINT "validation_users_external_school_uuid_fkey" FOREIGN KEY ("external_school_uuid") REFERENCES "validation_schools"("external_uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_roles" ADD CONSTRAINT "validation_roles_external_org_uuid_fkey" FOREIGN KEY ("external_org_uuid") REFERENCES "validation_organizations"("external_uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_programs" ADD CONSTRAINT "validation_programs_external_org_uuid_fkey" FOREIGN KEY ("external_org_uuid") REFERENCES "validation_organizations"("external_uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
