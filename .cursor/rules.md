# Greys AI Development Rules

This is a FastAPI backend project.

Project structure:

backend/app/
  api/
  core/
  models/
  schemas/

Rules for AI agents:

1. Do not change project structure.
2. Do not move files between folders.
3. All API endpoints must go to backend/app/api/endpoints.
4. All SQLAlchemy models must go to backend/app/models.
5. All Pydantic schemas must go to backend/app/schemas.
6. Do not refactor unrelated files.
7. Prefer minimal diffs.

Tech stack:

FastAPI
SQLAlchemy
PostgreSQL
Docker
