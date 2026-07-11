# OdinBook API

The Express and PostgreSQL service behind [OdinBook](https://github.com/whuang1101/OdinBook). It provides session authentication, profiles, posts, comments, likes, friend requests, image uploads, and the friends-only feed consumed by the React client.

## What the API provides

- Local email/password authentication with Passport
- Optional Facebook authentication
- PostgreSQL-backed, secure cross-site sessions
- Profile and account management
- Friends, requests, and connection suggestions
- Posts, likes, comments, and paginated feeds
- Cloudinary profile uploads with a local fallback image
- Consistent JSON errors and health checks
- Ownership checks for every authenticated write

## Local development

```bash
git clone https://github.com/whuang1101/OdinBook-server.git
cd OdinBook-server
cp .env.example .env
npm install
npm run dev
```

The API starts on `http://localhost:3000` by default. PostgreSQL connection variables are required to start the server. OdinBook uses an isolated `odinbook` schema and can safely share a database with another application.

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Optional complete PostgreSQL connection string |
| `PGHOST`, `PGPORT`, `PGDATABASE` | PostgreSQL server and existing database |
| `PGUSER`, `PGPASSWORD`, `PGSSLMODE` | PostgreSQL authentication and TLS settings |
| `DB_SCHEMA` | Isolated schema name, defaults to `odinbook` |
| `AUTO_MIGRATE` | Apply pending migrations at startup unless set to `false` |
| `SESSION_SECRET` | Secret used to sign session cookies; required in production |
| `CLIENT_ORIGINS` | Comma-separated browser origins allowed by CORS |
| `PUBLIC_API_URL` | Public API base URL used for callbacks and fallback images |
| `PORT` | HTTP port, defaults to `3000` |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | Enable Facebook login when both are present |
| `CLOUDINARY_*` | Enable Cloudinary-backed profile images |
| `DEFAULT_FRIEND_ID` | Optional user automatically connected to new accounts |

`CLIENT_ORIGIN` and `ORIGIN` remain supported as single-origin compatibility aliases. `KEY` remains supported for older session-secret deployments, but `SESSION_SECRET` is preferred.

## API groups

| Prefix | Responsibility |
| --- | --- |
| `/auth` | Login, current session, provider callback, logout |
| `/users` | Accounts, profiles, profile images, friend removal |
| `/friends` | Requests, suggestions, acceptance, cancellation |
| `/posts` | Feed, profile posts, likes, post mutations |
| `/comments` | Comment reads and mutations |
| `/health` | Deployment readiness |

The existing endpoint paths and response fields are retained for compatibility with the OdinBook client. Authentication failures and server errors are returned as JSON.

## Validation

```bash
npm test       # Syntax checks and HTTP/unit tests
npm run check  # Syntax checks only
npm run db:migrate # Create/update the isolated PostgreSQL schema
npm run db:seed    # Idempotently load the demo account and faux social data
```

The HTTP suite starts the Express app on an ephemeral port and verifies health, CORS, error responses, disabled providers, and authentication boundaries without requiring a test database.

## Deployment

The repository includes a multi-stage Docker image and a GitHub Actions workflow that publishes to GHCR and deploys to the shared VM when its SSH secrets are configured. See [`.env.example`](.env.example) for the environment contract.

Built by [Wilson Huang](https://github.com/whuang1101).
