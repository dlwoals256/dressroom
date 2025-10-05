# Dressroom

Virtual dressroom service on Google Gemini API.

## Structure

```
dressroom/
├── backend/
├── frontend/
├── firebase.json
├── Dockerfile
├── README.md
├── LICENSE
└── requirements.txt
```

## Features

- Register, Login (Auth by JWT)
- Register shop, management
- Virtual dressroom service by uploading user's picture
- PC/Mobile UI support
- Firebase Hosting
- Backend in Google Cloud Platform(GCP) with Django

---

# Try out your Dressroom!

## Get a Vertex API key for using Gemini features

1. Visit [Google AI Studio](https://aistudio.google.com/app/) and log in.
2. Open the dropdown "Dashboard" and "API Keys"
3. Click the upper right "Create an API Key" and follow the instructions to finish.
4. Click your key and copy the API Key.
5. Paste to "dressroom/.env" as `GEMINI_KEY=[YOUR-KEY]`

## Install DBMS(PostgreSQL), libraries, and frameworks

- You need:
    - Python, PostgreSQL, Django to run backends.
    - React.js + Vite, Firebase to run frontends.

## Build on local

### 1. Backend (Django)

```bash
cd path/to/dressroom
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 마이그레이션 및 서버 실행
python manage.py migrate
python manage.py runserver
```

### 2. Frontend (React)

```bash
cd frontend-react
npm install
npm run dev
```

### 3. Firebase Hosting

```bash
# Firebase CLI
npm install -g firebase-tools

# Login and deploy
firebase login
firebase init
firebase deploy
```

## API

- Register: `/api/register/`
- Log in: `/api/login/`
- Create a shop: `/api/shops/`
- Get dressed: `/api/generate/`

Check out the details on docs/API.md