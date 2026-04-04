# Contributing to StackWeave

Thank you for considering contributing to StackWeave! We welcome contributions from everyone.

## How to Contribute

### 🐛 Found a Bug?

- Check if it's already reported in [Issues](../../issues)
- If not, create a new issue with:
  - Clear title and description
  - Steps to reproduce
  - Expected vs actual behavior
  - Your environment (OS, Node version, etc.)

### 💡 Have an Idea?

- Open an issue to discuss it first
- We love feature requests and improvements!

### 🔧 Want to Fix Something?

1. **Fork the repository**
2. **Create a branch**: `git checkout -b fix/your-fix-name`
3. **Make your changes**
4. **Test thoroughly**: `yarn clean && yarn install && yarn dev`
5. **Commit**: `git commit -m "fix: description of fix"`
6. **Push**: `git push origin fix/your-fix-name`
7. **Open a Pull Request**

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/stackweave.git
cd stackweave

# Install dependencies
yarn install

# Setup database
createdb stackweave
yarn workspace @repo/db db:migrate

# Start development
yarn dev
```

## Code Style

- TypeScript for all code
- Follow existing patterns
- Run `yarn format` before committing
- Run `yarn lint` to check for issues

## Commit Convention

We use conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `chore:` Maintenance tasks
- `refactor:` Code refactoring

## Questions?

Feel free to ask in [Discussions](../../discussions) or open an issue!

---

Thank you for contributing! 🎉
