# School Budget — initial data model (draft)

Source: four 2569 Excel workbooks. Do not import transaction rows until reviewed.

- fiscalYears: fiscal year, approved totals and source references
- departments: academic, budget, personnel, general administration
- fundingSources: per-student subsidy, student-development activities, school revenue, other
- projects: department, project number/name, owner, fiscal year
- activities: parent project, activity number/name, owner
- allocations: fiscal year, project/activity, funding source, amount
- transactions: date, document number, description, amount, funding source, activity, remarks
- users: Firebase Auth uid, role, assigned departments/projects
- auditLogs: immutable changes and actor/timestamp

Important: project/activity allocation totals must not be double-counted; spreadsheet detail tabs and summary tabs overlap. Validate source dates, negative balances, and cross-project transfers before import. Dashboard aggregates should be computed from verified canonical records.
