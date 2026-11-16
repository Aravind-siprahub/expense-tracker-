# Contributing to Family Expense Tracker

Thanks for helping improve the project. Bug reports, ideas and pull requests are welcome.

## Reporting a bug or suggesting a feature

Open an issue and include:

- A clear title and description
- Steps to reproduce (for bugs), and what you expected to happen
- Your environment: operating system, Node version, and whether you used the web app or the mobile app

## Making a change

1. Fork the repository and create a branch, for example `fix/budget-alert` or `feat/export-csv`.
2. Set the project up by following [Getting started](README.md#getting-started).
3. Make your change. Keep it focused, and follow the patterns already in the code.
4. Check it before you push:
   ```bash
   corepack yarn format
   corepack yarn build
   ```
   Also run a TypeScript check in the app you changed, for example `npx tsc --noEmit` inside `apps/web`, `apps/backend` or `apps/mobile`.
5. Commit, push and open a pull request describing what changed and how you tested it.

## Guidelines

- Use TypeScript for all code.
- Store money as integer paise, never as decimals.
- Every API route that touches family data must check that the caller belongs to that family.
- Never commit secrets. `.env` files are ignored by git; put new settings in `.env.example` with a placeholder value.

## Commit messages

We use conventional commits: `feat:` for features, `fix:` for bug fixes, `docs:` for documentation, `refactor:` for code cleanup and `chore:` for maintenance.
