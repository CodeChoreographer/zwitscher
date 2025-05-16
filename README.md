# 🐦 Zwitscher – Moderne Chat-Anwendung mit Docker und WebSocket

**Zwitscher** ist die schweizer Chat App für alle die sich gerne auszwitschern

---

## 🚀 Features

- 🔐 JWT-basierte Authentifizierung (Login, Registrierung)
- 🧑‍💼 Öffentlicher Chat mit Nutzeranzeige
- 🔒 Privatchats mit Anfrage/Annahme-Logik
- ✍️ "Tippt gerade..."-Benachrichtigung (Public & Private Chat)
- 📎 Datei-Upload (Bilder, PDFs)
- 📊 Adminfunktionen & Rollenverwaltung
- 📦 Docker-Containerisierung (DB, Backend, Frontend, NGINX Load Balancer)
- ♻️ Loadbalancer mit WebSocket-Unterstützung
- ✅ Healthchecks & Ausfallsicherheit

---

## 📦 Technologie-Stack

| Layer       | Technologie                |
|-------------|----------------------------|
| Frontend    | Angular 19, Tailwind CSS, Angular Material |
| Backend     | Node.js + Express, Socket.IO |
| Datenbank   | MariaDB                    |
| Auth        | JWT                        |
| Infrastruktur | Docker, Docker Compose, NGINX |

---

## ⚙️ Installation & Start (Docker)

> Voraussetzung: [Docker Desktop](https://www.docker.com/products/docker-desktop/) installiert

```bash
git clone https://github.com/CodeChoreographer/zwitscher.git
cd zwitscher
docker compose up --build
```

Nach dem Start erreichbar unter:

Frontend: http://localhost:4200

Backend (API + WebSocket): http://localhost:3000

MariaDB: localhost:3306 -> Benutzername kann angepasst werden, falls ein eigener bereits vorhanden ist
