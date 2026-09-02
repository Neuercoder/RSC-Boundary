# rsc-boundary

Static data-leak analyzer for Next.js / React Server Components (RSC).

Goal: detect sensitive values (env secrets, DB records, session tokens, etc.) flow from server-only sources into RSC boundaries and client components.

Quick start

1. Install dependencies and build:

   npm install
   npm run build

2. Run the scanner locally (after building):

   npm run scan -- <path>

What I scaffolded

- CLI entrypoint (src/cli.ts) and core analyzer skeleton (src/analyzer.ts)
- TypeScript config and package.json with a simple build + scan script
- GitHub Actions CI to run build/tests
- README with overview and next steps

Next steps (suggested):
- Implement TypeScript AST-based taint analysis in src/analyzer.ts
- Add tests and example fixtures (Next.js apps) to validate findings
- Wire up serializers and DTO suggestions
- Add suppression rules and config format
