# System Overview

Varix is organized into five layers:

## 1. Ingestion
Adapters convert raw inputs (CSV/API) into a normalized schema.

## 2. Ledger
Append-only store of transactions with snapshot capability.

## 3. Processing
Pipelines apply deterministic transformations.

## 4. Reconciliation
Rules compare expected vs actual states to detect mismatches.

## 5. Output
Reports, logs, and exportable artifacts.

---

## Execution Model

Pipeline = ordered modules:

[Ingest] → [Normalize] → [Ledger Write] → [Process] → [Reconcile] → [Report]

Each step is:
- idempotent
- auditable
- composable
