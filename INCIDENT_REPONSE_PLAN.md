# Webpack Security Incident Response Plan

This document defines how the Webpack project responds to security incidents.  
 It is intended for maintainers and contributors who may need to coordinate a response.

## Scope

This plan applies to incidents such as:

- Vulnerabilities in Webpack core modules or official tools (e.g., `webpack-cli`, `webpack-dev-server`).
- Dependency vulnerabilities that impact Webpack users.
- Premature public disclosure of a vulnerability.
- Account compromise or supply-chain risks affecting the project.

## Communication Channels

- **Private & Preferred**: [GitHub Security Advisories](https://github.com/webpack/webpack/security/advisories).
- **Email**: `webpack-security@openjsf.org`.
- **Public**: GitHub releases, changelog, and advisories (after fix is available).

## Incident Response Workflow

### 1. Report Received

- Reports should be submitted via GitHub Security Advisories (preferred) or private email.
- **Acknowledgment timelines**:
  - Standard reports: within **30 days**.
  - Zero-day or critical vulnerabilities: within **7 days**.

### 2. Triage & Assessment

- Validate whether the report is security-related.
- Classify severity (critical, high, medium, low).
- Determine impact and scope (affected versions, configurations, or environments).

### 3. Containment & Private Fix Development

- Create a **private working group** (e.g., GitHub private fork or draft advisory).
- Explore temporary mitigations if immediate patching is not feasible.
- Maintain confidentiality during the process.

### 4. Fix & Testing

- Develop and review a fix privately.
- Add regression tests where applicable.
- Backport fixes to supported major versions if relevant.

### 5. Release

- Publish a patched release.
- Publish a security advisory simultaneously, including:
  - Description of the issue.
  - Impacted versions.
  - Severity rating.
  - Mitigation or upgrade steps.

## Summary Table

| Step            | Action                                          | Responsible Party           |
| --------------- | ----------------------------------------------- | --------------------------- |
| Report          | Submit via GH Advisory or email                 | Reporter                    |
| Acknowledge     | Confirm receipt (30 days / 7 days for critical) | Security Maintainer         |
| Triage          | Validate and classify severity                  | Security Maintainer         |
| Containment/Fix | Develop patch privately                         | Core + Security Maintainers |
| Release         | Publish patch & advisory                        | Security Maintainer         |
