---
status: partial
phase: 06-frontend-sending-integration
source: [06-VERIFICATION.md]
started: 2026-04-04T20:50:00Z
updated: 2026-04-04T20:50:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Full relay sending flow in demo mode
expected: Confirmation dialog shows broker count + temp address. Progress modal blocks navigation. Stats update per-broker. Rate limit pause shows amber countdown that auto-resumes. Completion shows View Campaign button that navigates to Track.
result: [pending]

### 2. Track page failed brokers
expected: Failed stat card shows count. Failed brokers show red badge with error code/message. Retry button resets broker to Selected. Retry All Failed resets all failed brokers.
result: [pending]

### 3. End Campaign flow
expected: Dialog says 'This will delete your temporary email address...' Confirming shows toast. Retry buttons disappear. Campaign ended date shows.
result: [pending]

### 4. Welcome screen temp address
expected: Button shows 'Creating campaign...' briefly (~500ms). After navigation and return, Welcome screen shows temp address like 'a7k9x3mq@erasurekit.uk' with 'Your real email is never shared with brokers' text.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
