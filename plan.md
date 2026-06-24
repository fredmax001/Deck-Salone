# Plan: Build "Sound It DJs" — Sierra Leone DJ Ecosystem Platform

## Overview
Build a professional full-stack web platform for DJs in Sierra Leone — featuring profiles, booking, rankings, mix hub, analytics, and more. Dark premium theme (Black/Gold/White).

## Skill Selection
- **Primary**: `vibecoding-webapp-swarm` — React + Vite + Tailwind CSS + shadcn/ui fullstack webapp
- **Database**: PostgreSQL (via Prisma ORM)
- **Backend**: Express.js API with Zod validation
- **Auth**: JWT + Google OAuth + Phone login
- **Storage**: Cloudinary (images), AWS S3 (mix files)

## Stage 1 — Skill Loading & Architecture Design
- Load `vibecoding-webapp-swarm` skill
- Design full database schema (Prisma)
- Design API architecture
- Design frontend routing & state management

## Stage 2 — Backend Development (Parallel where possible)
- Database schema & migrations (Prisma)
- Authentication system (JWT, Google, Phone)
- DJ Profile CRUD API
- Ranking Engine API
- Booking System API
- Mix Hub API
- Event Integration API
- Reviews & Ratings API
- Admin Dashboard API

## Stage 3 — Frontend Development (Parallel where possible)
- Project scaffolding with Vite + React + Tailwind + shadcn/ui
- Global state management (Zustand)
- Auth flows (login/register/forgot password)
- Home page (hero, featured DJs, rankings preview)
- Discover DJs page (search, filter, browse)
- Rankings page (leaderboards, categories)
- DJ Profile page (full portfolio view)
- Booking flow (search → request → payment)
- Mix Hub (categories, waveform player)
- Events page
- Hall of Fame
- Dashboard (analytics for DJs)
- Admin Dashboard
- Battle Arena

## Stage 4 — Integration & Polish
- Frontend-backend integration
- Animation polish (Framer Motion)
- Responsive design (mobile-ready)
- Performance optimization
- Final build & deploy

## Key Decisions
- Use React 19 + Vite + Tailwind v4 + shadcn/ui
- Express.js API with Prisma ORM
- PostgreSQL via connection string (Neon or Railway)
- Dark premium theme: Black (#0A0A0A), Gold (#D4AF37), White (#FFFFFF)
- Framer Motion for all animations
- Zustand for state management
- Axios for API calls
