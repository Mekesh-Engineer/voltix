.PHONY: help install dev frontend backend test lint build docker-up docker-down

help:
	@echo "Available commands:"
	@echo "  make install      - Setup virtualenv and install frontend & backend dependencies"
	@echo "  make dev          - Run both backend and frontend servers"
	@echo "  make backend      - Run FastAPI backend with Uvicorn"
	@echo "  make frontend     - Run Next.js frontend development server"
	@echo "  make test         - Run backend Pytest suite"
	@echo "  make build        - Build production bundle for frontend"
	@echo "  make docker-up    - Start full stack using Docker Compose"
	@echo "  make docker-down  - Stop all running Docker containers"

install:
	uv venv .venv --python 3.11
	uv pip install -r backend/requirements.txt --python .venv/Scripts/python.exe
	npm install

dev:
	npm run dev:all

backend:
	npm run dev:backend

frontend:
	npm run dev:frontend

test:
	npm test

build:
	npm run build

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down
