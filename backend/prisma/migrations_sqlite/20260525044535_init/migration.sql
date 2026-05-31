-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER'
);

-- CreateTable
CREATE TABLE "Die" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dieId" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "casing" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Set" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT
);

-- CreateTable
CREATE TABLE "_SetDies" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_SetDies_A_fkey" FOREIGN KEY ("A") REFERENCES "Die" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_SetDies_B_fkey" FOREIGN KEY ("B") REFERENCES "Set" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_MachineSets" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_MachineSets_A_fkey" FOREIGN KEY ("A") REFERENCES "Machine" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_MachineSets_B_fkey" FOREIGN KEY ("B") REFERENCES "Set" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Die_dieId_key" ON "Die"("dieId");

-- CreateIndex
CREATE UNIQUE INDEX "Set_name_key" ON "Set"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Machine_name_key" ON "Machine"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_SetDies_AB_unique" ON "_SetDies"("A", "B");

-- CreateIndex
CREATE INDEX "_SetDies_B_index" ON "_SetDies"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_MachineSets_AB_unique" ON "_MachineSets"("A", "B");

-- CreateIndex
CREATE INDEX "_MachineSets_B_index" ON "_MachineSets"("B");
