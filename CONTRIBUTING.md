# Contributing

Thanks for considering a contribution to Photon.

Photon is intentionally small. Changes should keep the resource focused on screenshot capture, upload, saving, and simple integrations around those features.

## Before Opening a Pull Request

- Keep changes focused and minimal.
- Avoid large rewrites unless there is a clear bug or maintenance reason.
- Do not commit `node_modules/` or generated `dist/` files.
- Run `npm run build` before submitting.
- Update `README.md` when changing exports, options, config, or behavior.

## Development

Install dependencies:

```bash
npm install
```

Build the resource:

```bash
npm run build
```

## Commit Style

Use short, direct commit messages, for example:

```text
Add Discord webhook screenshot export
Fix upload timeout cleanup
Document config options
```

## Security Issues

Do not report security issues in public issues. See `SECURITY.md`.
