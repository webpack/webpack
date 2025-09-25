# Security Policy

## Reporting a Vulnerability

Please report security issues **privately**:

- Email: [webpack-security@openjsf.org](mailto:webpack-security@openjsf.org)

**Do not** file public GitHub issues for security problems.

When reporting, please include:

- Affected project/repo and version(s)
- Impact and component(s) involved
- Reproduction steps or PoC (if available)
- Your contact details and preferred credit name

If you do not receive an acknowledgement of your report within **6 business days**, or if you cannot find a private security contact for the project, you may **escalate to the OpenJS Foundation CNA** at `security@lists.openjsf.org`.

If the project acknowledges your report but does not provide any further response or engagement within **14 days**, escalation is also appropriate.

## Coordination & Disclosure

We follow coordinated vulnerability disclosure:

- We will acknowledge your report, assess impact, and work on a fix.
- We aim to provide status updates until resolution.
- Once a fix or mitigation is available, we will publish a security advisory (and request a CVE via the OpenJS CNA when applicable).
- Reporters are credited by default unless you request otherwise.

---

## Guidelines for Security Testing

When investigating and reporting vulnerabilities, please **do not**:

- Break the law
- Access or modify data beyond what is needed to demonstrate the issue
- Use high-intensity or destructive testing tools
- Attempt denial of service (DoS) attacks
- Social engineer, phish, or physically attack project members
- Publicly disclose before we release a fix or advisory

---

## Threat Model

For an overview of the security assumptions, potential attack vectors, and areas
of concern relevant to webpack, please refer to the
[Threat Model](https://github.com/webpack/security-wg/blob/main/docs/threat-model.md).

---

## Incident Response

In the event of a broader security incident, please refer to our
[Security Incident Response Plan](https://github.com/webpack/webpack/blob/main/INCIDENT_RESPONSE_PLAN.md).
