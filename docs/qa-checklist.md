# NordFlow QA checklist

## Fixed in v1.1

- Fixed the hidden modal overlay rendering on first load by honoring the HTML `hidden` attribute in CSS.
- Added mobile navigation scrim and Escape-key handling.
- Added focus return when modals close and initial focus on the modal close control.
- Made recommendation identifiers stable so decisions survive re-derivation.
- Preserved approved/rejected recommendation history in local storage.
- Added concrete demo actions for reassignment, task movement and equipment movement.
- Removed the false behavior where approving a recommendation immediately marked the conflict resolved without changing the underlying schedule.
- Tenant-scoped equipment/resources and utilization conflict detection.
- Tenant-scoped audit history, including migration of legacy untagged audit rows.
- Added safe zero-budget handling for dashboard budget ratios.
- Added dynamic manager identity when switching workspaces.
- Added useful empty states for empty organizations and reports.

## Automated checks

```bash
npm test
npm run check
```

The test suite covers core conflict types, explainability, tenant scoping, stable recommendation behavior, concrete recommendation actions and zero-budget safety.

## Manual smoke test

1. Load the dashboard with a clean browser profile.
2. Confirm the recommendation modal is not visible until opened.
3. Open Recommendations and review an item.
4. Cancel the modal and confirm focus returns to the triggering button.
5. Open a concrete recommendation and approve it.
6. Confirm the local demo state changes and the recommendation moves to Decision history.
7. Open Conflicts and verify the related conflict is recalculated from the changed state.
8. Switch organizations and verify resources, conflicts, recommendations and audit entries remain tenant-scoped.
9. Resize below 800px and confirm the sidebar opens/closes with the navigation scrim.
10. Export a report CSV and confirm the download occurs locally.
