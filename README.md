# AI-HRMS Platform

A production-ready Human Resource Management System with AI-powered workforce intelligence capabilities.

## Overview

AI-HRMS is a full-stack web application designed to streamline workforce management through intelligent automation. The platform combines traditional HRMS functionality with advanced AI algorithms to provide actionable insights for HR managers and team leads.

## Key Features

### Core HRMS Functionality
- Multi-tenant organization management with complete data isolation
- Employee lifecycle management (onboarding, updates, deactivation)
- Task assignment and tracking with status workflow enforcement
- Real-time analytics dashboard with automatic metric updates
- Secure JWT-based authentication with refresh token rotation

### AI-Powered Capabilities

**Productivity Scoring**
- Multi-factor algorithm analyzing completion rate, task complexity, and time efficiency
- Weighted scoring system (Completion: 40%, Time: 30%, Complexity: 30%)
- Historical tracking with time-decay for recent performance emphasis
- Automatic recalculation on task completion

**Skill Gap Detection**
- Comparison of employee skills against role requirements
- Priority-based gap identification (Critical, High, Medium, Low)
- Organization-wide skill analysis for training program planning
- Personalized development recommendations

**Performance Trend Prediction**
- Linear regression analysis of historical productivity data
- Trend classification (Improving, Declining, Stable) with confidence scoring
- Early identification of at-risk employees
- Contributing factor analysis for actionable insights

**Smart Task Assignment**
- Multi-criteria recommendation engine for optimal task-employee matching
- Weighted scoring: Skills (40%), Workload (30%), Productivity (20%), Availability (10%)
- Top-5 recommendations with transparent reasoning
- Workload balancing to prevent employee burnout

## Technical Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React Query for server state, Context API for auth
- **Routing**: React Router v6
- **HTTP Client**: Axios with request/response interceptors
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **Database**: PostgreSQL with connection pooling
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: Express-validator for input sanitization
- **Logging**: Winston for structured logging
- **Testing**: Jest with property-based tests

### Database Schema
- Organizations (multi-tenancy root)
- Employees (with JSONB skills storage)
- Tasks (with status constraints and cascade rules)
- Productivity Scores (historical tracking)
- Skill Taxonomy (35+ predefined skills)
- Role Requirements (skill-role mappings)
- Notifications (for future features)
- Blockchain Transactions (Web3 integration ready)

## Project Structure

```
ai-hrms/
├── backend/
│   ├── src/
│   │   ├── config/          # Environment configuration
│   │   ├── controllers/     # Request handlers
│   │   ├── database/        # Migrations and connection
│   │   ├── middleware/      # Auth and validation
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   └── utils/           # Helpers and logging
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React contexts
│   │   ├── lib/             # API client and utilities
│   │   └── pages/           # Route components
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Installation

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Git

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run migrate
npm run seed
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with backend API URL
npm run dev
```

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/ai_hrms
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000/api
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new organization
- `POST /api/auth/login` - Login and receive JWT tokens
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user info

### Employees
- `POST /api/employees` - Create employee
- `GET /api/employees` - List employees (with filters)
- `GET /api/employees/:id` - Get employee details
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks` - List tasks (with filters)
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task
- `PATCH /api/tasks/:id/status` - Update task status
- `DELETE /api/tasks/:id` - Delete task

### Dashboard
- `GET /api/dashboard/metrics` - Get dashboard metrics
- `GET /api/dashboard/trends` - Get productivity trends

### AI Features
- `GET /api/ai/productivity/:employeeId` - Get productivity score
- `POST /api/ai/batch-calculate` - Recalculate all scores
- `GET /api/ai/scores` - Get all productivity scores
- `GET /api/ai/skill-gaps/:employeeId` - Get employee skill gaps
- `GET /api/ai/skill-gaps` - Get organization skill gaps
- `POST /api/ai/recommend-assignment` - Get task assignment recommendations
- `POST /api/ai/validate-assignment/:employeeId` - Validate task assignment
- `GET /api/ai/performance-trend/:employeeId` - Get performance trend
- `GET /api/ai/performance-trends` - Get all performance trends
- `GET /api/ai/at-risk` - Get at-risk employees

## Testing

### Backend Tests
```bash
cd backend
npm test                    # Run all tests
npm run test:coverage      # Run with coverage report
```

### Test Coverage
- Unit tests for business logic
- Integration tests for API endpoints
- Property-based tests for data integrity
- 28+ test suites with comprehensive coverage

## Deployment

### Production Build

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

### Recommended Hosting
- **Frontend**: Vercel, Netlify, or AWS Amplify
- **Backend**: Railway, Render, or AWS Elastic Beanstalk
- **Database**: Railway PostgreSQL, AWS RDS, or Heroku Postgres

## Security Features

- Password hashing with bcrypt (10 rounds)
- JWT token expiration and refresh mechanism
- SQL injection prevention through parameterized queries
- XSS protection via input sanitization
- CORS configuration for cross-origin security
- Multi-tenant data isolation at database level
- Environment-based configuration management

## Performance Optimizations

- Database connection pooling
- Query optimization with strategic indexes
- React Query caching with automatic invalidation
- Lazy loading and code splitting (frontend)
- Async processing for AI calculations
- Dashboard metric caching (30-second refresh)

## Future Enhancements

- Blockchain integration for immutable workforce records
- Employee self-service portal with individual login
- Advanced analytics and custom reporting
- Email notification system
- Data export (CSV/JSON)
- Mobile application
- Integration with external HR systems
- Rate limiting and Redis caching

## Development Workflow

### Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature branches

### Code Quality
- TypeScript for type safety
- ESLint and Prettier for code formatting
- Comprehensive error handling
- Structured logging with Winston
- Git hooks for pre-commit validation

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Nithin Chalamchala

## Acknowledgments

Built as part of the RizeOS internship application, demonstrating full-stack development capabilities with AI integration.

## Support

For questions or issues, please open an issue on GitHub or contact the maintainer.

---

**Note**: This is a portfolio/demonstration project. For production deployment, ensure proper security audits, load testing, and compliance with data protection regulations.
