/*
  Warnings:

  - You are about to drop the `_MachineSets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_SetDies` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "_MachineSets_B_index";

-- DropIndex
DROP INDEX "_MachineSets_AB_unique";

-- DropIndex
DROP INDEX "_SetDies_B_index";

-- DropIndex
DROP INDEX "_SetDies_AB_unique";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_MachineSets";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_SetDies";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Die" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dieId" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "casing" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "setId" TEXT,
    CONSTRAINT "Die_setId_fkey" FOREIGN KEY ("setId") REFERENCES "Set" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Die" ("casing", "createdAt", "details", "dieId", "id", "size") SELECT "casing", "createdAt", "details", "dieId", "id", "size" FROM "Die";
DROP TABLE "Die";
ALTER TABLE "new_Die" RENAME TO "Die";
CREATE UNIQUE INDEX "Die_dieId_key" ON "Die"("dieId");
CREATE TABLE "new_Set" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "machineId" TEXT,
    CONSTRAINT "Set_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Set" ("description", "id", "name") SELECT "description", "id", "name" FROM "Set";
DROP TABLE "Set";
ALTER TABLE "new_Set" RENAME TO "Set";
CREATE UNIQUE INDEX "Set_name_key" ON "Set"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
