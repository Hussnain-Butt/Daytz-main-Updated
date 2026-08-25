![Daytz](https://img.shields.io/badge/Daytz-Dating_App-FF4B6E?style=for-the-badge)

# Daytz

**Daytz** is a full-stack, location-based dating application. Users build a profile, post their availability to a shared calendar, and rate their interest in other users' calendar entries; mutual interest turns into a scheduled, mutually-approved **date**.

The repository is a small monorepo with two projects:

- **`Frontend/`** — an Expo / React Native mobile app
- **`Backend/`** — a Node.js / Express / TypeScript REST API, PostgreSQL schema, and a set of Python scripts for geographic (zip-code) data preparation

<p>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white">
  <img alt="React Native" src="https://img.shields.io/badge/React_Native-20232A?style=flat-square&logo=react&logoColor=61DAFB">
  <img alt="Expo" src="https://img.shields.io/badge/Expo-000020?style=flat-square&logo=expo&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white">
  <img alt="Python" src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white">
  <img alt="Auth0" src="https://img.shields.io/badge/Auth0-EB5424?style=flat-square&logo=auth0&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-unspecified-lightgrey?style=flat-square">
</p>

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Core Features](#core-features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Geo Data Preparation (Python)](#geo-data-preparation-python)
- [Available Scripts](#available-scripts)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [License](#license)

## Overview

Daytz's data model (visible directly in the backend's handlers, repositories, and types) centers on a few core entities:

- **Users** have a profile picture and an intro/homepage video, and authenticate through Auth0.
- **Calendar days** are entries a user posts to their own calendar, optionally with an attached video.
- **Attraction** records let one user rate their interest in another user's calendar entry across three separate dimensions — romantic, sexual, and friendship — with an outcome result and "first message rights" attached to the match.
- **Dates** are created from that matching process: a proposed meetup with a location that both the sending and receiving user must approve, with logic to resolve conflicts when a user already has an overlapping date.
- **Date messages** let matched users message each other in the context of a specific date.

Around that core, the app adds push notifications, an in-app token/transaction system, in-app advertisements, onboarding tutorials, user blocking/reporting, and an internal (admin-only) system for flagging suspicious posting patterns — see `Backend/ABUSE_DETECTION_PLAN.md`. Location-based matching is supported by a set of Python scripts that pre-compute distances between US zip codes.

## Tech Stack

### Frontend (`Frontend/`)
- **React Native 0.79** on **Expo SDK 53**, with **Expo Router** for file-based navigation and **React Navigation** (bottom tabs / native stack)
- **TypeScript**
- **NativeWind** (Tailwind CSS for React Native)
- **Zustand** for client-side state, plus React Context for auth/user state (`AuthContext`, `UserContext`)
- **Auth0** via `react-native-auth0`, `expo-auth-session`, and `expo-secure-store`
- **`react-native-calendars`** and native date/time pickers for the calendar UI
- **`react-native-google-places-autocomplete`** for location input
- **Firebase Cloud Messaging** (`@react-native-firebase/messaging`) and **OneSignal** for push notifications
- **Jest** / `jest-expo` / Testing Library for unit tests, **Detox** for end-to-end tests
- **EAS** (`eas.json`) for native builds

### Backend (`Backend/`)
- **Node.js**, **Express**, **TypeScript**
- **PostgreSQL** via `pg`, with SQL migrations in `db/migrations` and setup scripts in `db/scripts`
- **Auth0** JWT verification (`express-jwt`, `express-oauth2-jwt-bearer`, `jwks-rsa`)
- **AWS S3** for file storage (`@aws-sdk/client-s3`), with `multer` handling uploads
- **Vimeo API** for hosting profile and calendar videos
- **Firebase Admin** and **OneSignal** for push notifications
- **Nodemailer** (Gmail SMTP) for emailing user reports
- **Swagger** (`swagger-jsdoc` + `swagger-ui-express`) for interactive API docs
- Deployed via **Railway** (`railway-start` script)

### Data Preparation (`Backend/dataPreparation/`)
- **Python 3** with `geopandas`, `shapely`, `pyproj`, `fiona`, `Rtree`, `pandas`, and `psycopg2`
- Turns a US zip-code coordinate list (`US_zipcodes_longitude_and_latitude.csv`) into zip-code distance groupings (`zipcode_distance_groups.csv`) that the backend uses for proximity-based matching

## Repository Structure

```
.
├── Backend/                    # Express + TypeScript REST API
│   ├── src/
│   │   ├── handlers/            # Route handlers (users, dates, attraction, calendar days, ...)
│   │   ├── repository/          # PostgreSQL data-access layer
│   │   ├── services/            # External integrations
│   │   ├── middleware.ts        # Auth0 JWT middleware
│   │   ├── routes.ts            # API route definitions
│   │   └── swagger.ts           # Swagger / OpenAPI setup
│   ├── db/
│   │   ├── migrations/          # SQL schema migrations
│   │   └── scripts/             # DB setup scripts
│   ├── dataPreparation/         # Python zip-code distance grouping scripts
│   ├── __tests__/               # Backend tests
│   └── requirements.txt         # Python dependencies for dataPreparation/
└── Frontend/                    # Expo / React Native mobile app
    ├── app/                      # Expo Router screens ("(auth)" and "(app)" route groups)
    ├── components/
    ├── contexts/                 # AuthContext, UserContext
    ├── store/                    # Zustand store
    ├── api/                      # API client
    └── e2e/                      # Detox end-to-end tests
```

## Core Features

Grounded directly in the backend's route handlers, repositories, and data model:

- **Auth0 authentication** shared between the mobile app and the API, with JWT-protected routes
- **User profiles**, including a profile picture and an intro/homepage video
- **Calendar-based availability** — users post to a shared calendar, optionally attaching a video to a given day
- **Attraction ratings** — rating another user's calendar entry across romantic, sexual, and friendship interest
- **Dates** — mutually-approved meetups with a location, including conflict resolution for overlapping schedules
- **Date messaging** scoped to a specific date
- **Push notifications** via Firebase Cloud Messaging and OneSignal
- **Token balance and transactions** for in-app credits/purchases
- **In-app advertisements**
- **Onboarding tutorials**, including a persisted calendar tutorial and a "wingman" prompt
- **User blocking and reporting**, plus an internal, admin-only system for flagging suspicious posting patterns
- **Location-aware matching** using precomputed zip-code distance groupings

## Getting Started

### Prerequisites

- Node.js (LTS) and npm
- PostgreSQL
- Python 3.x — only needed if you're regenerating the files in `Backend/dataPreparation/`
- Expo CLI / EAS CLI, and either the Expo Dev Client workflow or Android Studio / Xcode for native builds
- Credentials for the third-party services the app integrates with: **Auth0**, **AWS S3**, **Vimeo**, **Firebase**, **OneSignal**, and (for report emails) a Gmail account with an app password

### Backend Setup

```bash
cd Backend
npm install
```

Create a `.env` file in `Backend/` with the variables the API needs at runtime — a PostgreSQL connection, Auth0 domain/audience, AWS S3 keys, Vimeo API keys, Firebase Admin credentials, OneSignal keys, and `PORT` (defaults to `3000` if unset). `Backend/.env.email.example` documents the SMTP variables specifically used for emailing user reports over Gmail SMTP.

```bash
npm run build      # compile TypeScript to dist/ (also copies db/scripts/create.sql)
npm run migrate      # run database migrations
npm run dev           # start the API with nodemon at http://localhost:3000
```

### Frontend Setup

```bash
cd Frontend
npm install           # postinstall runs patch-package automatically

npx expo start --dev-client   # start the Expo dev server
npm run android                 # expo run:android
npm run ios                     # expo run:ios
npm run web                      # expo start --web
```

The app also expects its own environment/config values (Auth0 domain and client ID, API base URL, Google Places API key, etc.) — see `Frontend/auth_config.json` and `Frontend/app.json`.

### Geo Data Preparation (Python)

```bash
cd Backend
pip install -r requirements.txt
python dataPreparation/createZipcodeWithinRangesCsv.py
```

This regenerates `zipcode_distance_groups.csv` from `US_zipcodes_longitude_and_latitude.csv`.

## Available Scripts

**Backend** (`Backend/package.json`)

| Script | Description |
| --- | --- |
| `npm run dev` | Run the API locally with nodemon (`src/index.ts`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run the compiled server (`node dist/index.js`) |
| `npm run migrate` | Run database migrations |
| `npm run migrate:prod` | Build, then run migrations |
| `npm run railway-start` | Build, then start — used for Railway deployment |

**Frontend** (`Frontend/package.json`)

| Script | Description |
| --- | --- |
| `npm start` | `expo start --dev-client` |
| `npm run android` | `expo run:android` |
| `npm run ios` | `expo run:ios` |
| `npm run web` | `expo start --web` |
| `npm test` | Run Jest unit tests |

## API Documentation

When the backend is running locally, interactive Swagger/OpenAPI docs are served at:

```
http://localhost:3000/api-docs
```

## Testing

- **Backend**: unit/integration tests live in `Backend/__tests__/`; the Python data-preparation dependencies also include `pytest` and `responses`.
- **Frontend**: `npm test` runs Jest (`jest-expo` + Testing Library); end-to-end tests run via Detox, configured in `Frontend/.detoxrc.js` with specs under `Frontend/e2e/`.

## License

No license file is currently included in this repository.
