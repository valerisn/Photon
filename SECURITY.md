# Security Policy

## Supported Versions

Photon is maintained on a best-effort basis. Security fixes are only expected for the latest version on the default branch.

| Version | Supported |
| --- | --- |
| Latest | Yes |
| Older versions | No |

## Reporting a Vulnerability

If you find a vulnerability, please do not open a public issue with exploit details.

Report it privately through GitHub's private vulnerability reporting if available, or contact the repository owner directly through GitHub.

Please include:

- A clear description of the issue.
- Steps to reproduce it.
- The affected Photon version or commit.
- Any relevant server/client environment details.
- The impact you believe the issue has.

## Scope

Security-sensitive areas include:

- Server-side screenshot request handling.
- Upload token handling.
- Discord webhook upload behavior.
- File save paths and generated filenames.
- Any path that accepts remote URLs, metadata, or user-controlled options.

## Out of Scope

The following are generally out of scope:

- Issues caused by modified forks.
- Misconfigured Discord webhooks or leaked webhook URLs outside Photon.
- Denial-of-service caused by intentionally setting unsafe config values.
- Vulnerabilities in FiveM, CFX, Discord, or third-party infrastructure outside this resource.
