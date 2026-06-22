# Sample source data — UST STTM profiling input

A small **relational healthcare/claims** dataset for the Profiling workflow.
Upload one or more CSVs (or the ZIP) on the "New Profiling" page.

## Files & keys
| File | Rows | Primary key | Foreign keys |
|------|------|-------------|--------------|
| groups.csv         | 15  | group_id    | — |
| providers.csv      | 25  | provider_id | — |
| members.csv        | 80  | member_id   | group_id → groups |
| medical_claims.csv | 220 | claim_id    | member_id → members, group_id → groups, provider_id → providers |

Uploading all four lets **Relationship Analysis** detect the foreign keys / composite keys.

## Intentionally seeded anomalies (for Data Anomaly Analysis to surface)
- `members.csv`: ~15% null `email`; nullable `term_date`; one lowercase `state`; one duplicate member row.
- `groups.csv`: nullable `expiration_date`.
- `medical_claims.csv`: an outlier `claim_amount` (999999.99); a negative `paid_amount` (-150); an invalid `diagnosis_code` ("XXXXX"); two duplicate claim rows.

Regenerate anytime with `sample_data/generate.py` (seeded, reproducible).
