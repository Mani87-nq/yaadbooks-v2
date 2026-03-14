-- YaadBooks: Add Accountant-Client Relationship Feature
-- This migration adds support for external accountants managing multiple client businesses
-- Migration: 20260715120000_add_accountant_client

-- =============================================================================
-- ENUM: AccountantClientStatus
-- Tracks the lifecycle of an accountant-client relationship
-- =============================================================================
CREATE TYPE "AccountantClientStatus" AS ENUM (
    'PENDING',     -- Invitation sent, not yet accepted
    'ACTIVE',      -- Client accepted, relationship active
    'SUSPENDED',   -- Temporarily suspended (e.g., payment issues)
    'REVOKED'      -- Access removed permanently
);

-- =============================================================================
-- TABLE: AccountantClient
-- Links external accountants (Users) to client Companies they manage
-- =============================================================================
CREATE TABLE "AccountantClient" (
    -- Primary Key
    "id" TEXT NOT NULL,
    
    -- Foreign Keys
    "accountantId" TEXT NOT NULL,       -- User who is the accountant
    "companyId" TEXT NOT NULL,          -- Client company being managed
    
    -- Invitation tracking
    "status" "AccountantClientStatus" NOT NULL DEFAULT 'PENDING',
    "invitedEmail" TEXT,                -- Email used in invitation (may differ from user email)
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),          -- When the invitation was accepted
    
    -- Granular access permissions (default to full access for accountants)
    "canAccessPayroll" BOOLEAN NOT NULL DEFAULT true,
    "canAccessBanking" BOOLEAN NOT NULL DEFAULT true,
    "canExportData" BOOLEAN NOT NULL DEFAULT true,
    
    -- Optional notes about the engagement
    "notes" TEXT,
    
    -- Audit timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountantClient_pkey" PRIMARY KEY ("id")
);

-- =============================================================================
-- UNIQUE CONSTRAINT
-- An accountant can only have one relationship per company
-- =============================================================================
CREATE UNIQUE INDEX "AccountantClient_accountantId_companyId_key" 
    ON "AccountantClient"("accountantId", "companyId");

-- =============================================================================
-- INDEXES for Query Performance
-- =============================================================================

-- Index: Find all clients for a specific accountant
-- Use case: Accountant dashboard showing all managed companies
CREATE INDEX "AccountantClient_accountantId_idx" 
    ON "AccountantClient"("accountantId");

-- Index: Find all accountants for a specific company
-- Use case: Company settings showing who has access
CREATE INDEX "AccountantClient_companyId_idx" 
    ON "AccountantClient"("companyId");

-- Index: Filter by status (for pending invitations, active relationships)
-- Use case: Admin views filtering by relationship status
CREATE INDEX "AccountantClient_status_idx" 
    ON "AccountantClient"("status");

-- Composite index: Accountant + Status for filtered dashboard queries
-- Use case: "Show me all my ACTIVE clients"
CREATE INDEX "AccountantClient_accountantId_status_idx" 
    ON "AccountantClient"("accountantId", "status");

-- =============================================================================
-- FOREIGN KEY CONSTRAINTS
-- =============================================================================

-- FK to User table (the accountant)
-- ON DELETE CASCADE: If user is deleted, remove all their client relationships
ALTER TABLE "AccountantClient" 
    ADD CONSTRAINT "AccountantClient_accountantId_fkey" 
    FOREIGN KEY ("accountantId") 
    REFERENCES "User"("id") 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

-- FK to Company table (the client company)
-- ON DELETE CASCADE: If company is deleted, remove the accountant relationship
ALTER TABLE "AccountantClient" 
    ADD CONSTRAINT "AccountantClient_companyId_fkey" 
    FOREIGN KEY ("companyId") 
    REFERENCES "Company"("id") 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

-- =============================================================================
-- COMMENTS (PostgreSQL documentation)
-- =============================================================================
COMMENT ON TABLE "AccountantClient" IS 
    'Manages relationships between external accountants and the companies they service';

COMMENT ON COLUMN "AccountantClient"."accountantId" IS 
    'References the User who acts as the external accountant';

COMMENT ON COLUMN "AccountantClient"."companyId" IS 
    'References the Company being managed by the accountant';

COMMENT ON COLUMN "AccountantClient"."status" IS 
    'Lifecycle status: PENDING → ACTIVE → SUSPENDED/REVOKED';

COMMENT ON COLUMN "AccountantClient"."invitedEmail" IS 
    'Email used for invitation (useful when accountant registers with different email)';

COMMENT ON COLUMN "AccountantClient"."canAccessPayroll" IS 
    'Permission flag: Can accountant view/manage employee payroll data';

COMMENT ON COLUMN "AccountantClient"."canAccessBanking" IS 
    'Permission flag: Can accountant view/manage bank accounts and reconciliation';

COMMENT ON COLUMN "AccountantClient"."canExportData" IS 
    'Permission flag: Can accountant export company financial data';
