# Automated Emails Backend

A TypeScript-based Express.js backend for managing and automating job application follow-up emails.

## Features

- RESTful API for job applications and follow-ups
- MongoDB database integration with Mongoose
- Automated email scheduling using node-cron
- Secure authentication with JWT
- Email templating system
- Environment-based configuration

## Prerequisites

- Node.js 18.x or higher
- MongoDB 4.x or higher

## Installation

1. Clone the repository
2. Install dependencies:

```bash
cd backend-mean
npm install
```

3. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

4. Update the environment variables in the `.env` file with your MongoDB credentials and email settings.

## Development

Start the development server with hot reloading:

```bash
npm run dev
```

## Production Build

Create a production build:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## API Endpoints

### Job Applications

- `GET /api/applications` - Get all job applications
- `GET /api/applications/:id` - Get a specific job application
- `POST /api/applications` - Create a new job application
- `PUT /api/applications/:id` - Update a job application
- `DELETE /api/applications/:id` - Delete a job application

### Follow-ups

- `GET /api/followups` - Get all follow-ups
- `GET /api/followups/:id` - Get a specific follow-up
- `POST /api/followups` - Create a new follow-up
- `PUT /api/followups/:id` - Update a follow-up
- `DELETE /api/followups/:id` - Delete a follow-up

## Email Scheduler

The system includes an email scheduler that automatically sends follow-up emails based on configured settings. Configure the schedule in `src/services/scheduler.service.ts`.

## Directory Structure

```
backend-mean/
├── src/
│   ├── controllers/    # Request handlers
│   ├── models/         # Mongoose models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── middleware/     # Express middleware
│   ├── utils/          # Utility functions
│   ├── config/         # Configuration
│   ├── templates/      # Email templates
│   ├── app.ts          # Express app
│   └── server.ts       # Entry point
├── dist/               # Compiled JavaScript
├── node_modules/       # Dependencies
├── .env                # Environment variables
├── .env.example        # Environment template
├── package.json        # Project info & dependencies
└── tsconfig.json       # TypeScript configuration
``` 