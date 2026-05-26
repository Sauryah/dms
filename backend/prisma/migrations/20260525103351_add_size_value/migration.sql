-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Die" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dieId" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "sizeValue" REAL NOT NULL DEFAULT 0.0,
    "casing" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "setId" TEXT,
    CONSTRAINT "Die_setId_fkey" FOREIGN KEY ("setId") REFERENCES "Set" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Die" ("casing", "createdAt", "details", "dieId", "id", "setId", "size") SELECT "casing", "createdAt", "details", "dieId", "id", "setId", "size" FROM "Die";
DROP TABLE "Die";
ALTER TABLE "new_Die" RENAME TO "Die";
CREATE UNIQUE INDEX "Die_dieId_key" ON "Die"("dieId");
CREATE INDEX "Die_sizeValue_idx" ON "Die"("sizeValue");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
