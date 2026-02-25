# Contributing to AI-HRMS Platform

Thank you for considering contributing to the AI-HRMS Platform. This document outlines the process and guidelines for contributing.

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow. Please be respectful and constructive in all interactions.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- Clear and descriptive title
- Detailed steps to reproduce the issue
- Expected behavior vs actual behavior
- Screenshots if applicable
- Environment details (OS, Node version, browser)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- Clear and descriptive title
- Detailed description of the proposed functionality
- Explanation of why this enhancement would be useful
- Possible implementation approach

### Pull Requests

1. Fork the repository and create your branch from `main`
2. Follow the existing code style and conventions
3. Write clear, concise commit messages
4. Include tests for new functionality
5. Update documentation as needed
6. Ensure all tests pass before submitting

## Development Setup

### Prerequisites
- Node.js 18 or higher
- PostgreSQL 14 or higher
- Git

### Local Development

```bash
# Clone your fork
git clone https://github.com/your-username/ai-hrms.git
cd ai-hrms

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Run database migrations
cd backend
npm run migrate
npm run seed

# Start development servers
npm run dev  # In backend directory
npm run dev  # In frontend directory (separate terminal)
```

## Code Style Guidelines

### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow existing naming conventions
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Prefer const over let, avoid var
- Use async/await over promises where possible

### React Components
- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use TypeScript interfaces for props
- Follow the existing component structure

### Backend Code
- Follow RESTful API conventions
- Use proper HTTP status codes
- Implement comprehensive error handling
- Add input validation for all endpoints
- Write unit tests for business logic

## Testing

### Running Tests

```bash
# Backend tests
cd backend
npm test

# With coverage
npm run test:coverage
```

### Writing Tests
- Write tests for all new features
- Maintain or improve code coverage
- Use descriptive test names
- Follow the existing test structure

## Commit Message Guidelines

Use clear and meaningful commit messages:

```
feat: Add employee skill gap analysis
fix: Resolve task status transition bug
docs: Update API documentation
test: Add tests for productivity scoring
refactor: Simplify authentication middleware
```

Prefixes:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `style`: Code style changes
- `chore`: Maintenance tasks

## Branch Naming

Use descriptive branch names:
- `feature/task-assignment-ai`
- `fix/dashboard-metrics-bug`
- `docs/api-documentation`

## Review Process

1. All submissions require review
2. Reviewers will check code quality, tests, and documentation
3. Address review comments promptly
4. Maintain a respectful and constructive dialogue

## Questions?

Feel free to open an issue for questions or clarifications about contributing.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
