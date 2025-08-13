# Contributing to BRACU Loop

Thank you for your interest in contributing to BRACU Loop! This document provides guidelines and information for contributors.

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/bracu-loop.git
   cd bracu-loop
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up environment** (see README.md for details)
5. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📋 Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow the existing code style and conventions
- Use meaningful variable and function names
- Add comments for complex logic
- Use Prettier for code formatting
- Follow ESLint rules

### Component Structure
- Place React components in `src/components/`
- Use functional components with hooks
- Implement proper TypeScript interfaces
- Follow the shadcn/ui component patterns

### Database Changes
- Always include migration scripts
- Test database changes thoroughly
- Update the schema documentation
- Consider backwards compatibility

### Testing
- Test your changes thoroughly
- Verify both desktop and mobile layouts
- Test with different user roles
- Check dark mode compatibility

## 🔧 Development Process

### Before Starting
1. Check existing issues and PRs
2. Create an issue to discuss major changes
3. Ensure your development environment is set up

### While Developing
1. Make small, focused commits
2. Write clear commit messages
3. Test your changes frequently
4. Keep your branch up to date with main

### Commit Message Format
Use the conventional commits format:
```
type(scope): description

Examples:
feat(auth): add Google OAuth integration
fix(voting): resolve duplicate vote issue
docs(readme): update installation instructions
style(ui): improve mobile responsiveness
refactor(database): optimize review queries
```

### Pull Request Process
1. **Update your branch** with the latest main:
   ```bash
   git checkout main
   git pull upstream main
   git checkout your-feature-branch
   git rebase main
   ```

2. **Run tests and linting**:
   ```bash
   npm run lint
   npm run type-check
   npm run build
   ```

3. **Create a Pull Request** with:
   - Clear title and description
   - Screenshots for UI changes
   - Testing instructions
   - Related issue numbers

4. **Address review feedback** promptly

## 📝 Issue Guidelines

### Bug Reports
Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser/device information
- Console error messages

### Feature Requests
Include:
- Clear description of the feature
- Use case and benefits
- Possible implementation approach
- Mockups or wireframes if applicable

## 🎨 UI/UX Guidelines

### Design Principles
- Mobile-first responsive design
- Accessibility compliance (WCAG 2.1)
- Dark mode support
- Consistent spacing and typography
- Intuitive user experience

### Component Guidelines
- Use shadcn/ui components when possible
- Maintain consistent styling patterns
- Implement proper loading states
- Add appropriate animations and transitions
- Ensure keyboard navigation support

## 🗄️ Database Guidelines

### Schema Changes
- Always provide migration scripts
- Include rollback procedures
- Document schema changes
- Test with realistic data volumes

### Query Optimization
- Use proper indexes
- Optimize for common use cases
- Consider query performance
- Monitor database performance

## 🔒 Security Guidelines

### Authentication
- Never hardcode secrets
- Use environment variables
- Implement proper session management
- Follow OAuth best practices

### Data Protection
- Implement proper input validation
- Use parameterized queries
- Follow GDPR compliance
- Protect user privacy

## 📚 Documentation

### Code Documentation
- Document complex functions
- Include TypeScript interfaces
- Add JSDoc comments for public APIs
- Update README for major changes

### User Documentation
- Update user guides for new features
- Include screenshots and examples
- Keep documentation current
- Consider different user skill levels

## 🌟 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- Special mentions for outstanding contributions

## 📞 Getting Help

- **Discussions**: Use GitHub Discussions for questions
- **Issues**: Create issues for bugs and feature requests
- **Discord**: Join our community Discord (if available)
- **Email**: Contact maintainers directly for sensitive issues

## 📄 License

By contributing to BRACU Loop, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to BRACU Loop! 🎉
