# 🏆 La Pachanga

**La Pachanga** es una plataforma web dedicada a las predicciones del competitivo de **League of Legends (LoL)**. Lo que comenzó como un proyecto personal gestionado manualmente durante años, ahora es una aplicación completa donde los usuarios pueden competir, votar por sus equipos favoritos y subir en el ranking según sus aciertos.

🌐 **Web Oficial:** [pachanga.lol](https://pachanga.lol)

---

## 🚀 Funcionalidades Principales

- **Predicciones en Tiempo Real:** Vota por los ganadores de los partidos de las principales ligas (LEC, LCK, LPL, etc.).
- **Sistema de Puntuación:** Ganan puntos por aciertos en ganador y marcador exacto.
- **Rachas y Bonos:** Multiplicadores por rachas de aciertos y bonos por equipo favorito (Kensukee Rule).
- **Ranking (Leaderboard):** Clasificación semanal y global con podio visual para los mejores.
- **Hall of Flame:** Espacio histórico para honrar a los leyendas y ganadores de ediciones pasadas.
- **Panel de Administración:** Gestión de ligas, partidos, resultados y usuarios.

---

## 🛠️ Tecnologías Empleadas

### Frontend
- **React 19 + Vite:** SPA rápida y moderna.
- **Ant Design (Antd 5):** Sistema de componentes UI profesional.
- **Framer Motion:** Animaciones fluidas y Modo Loco/Bizarro.
- **Context API:** Gestión de estados globales y temas.

### Backend
- **Node.js + Express:** API REST robusta.
- **Sequelize ORM:** Gestión de base de datos relacional.
- **PostgreSQL:** Almacenamiento de datos persistente.
- **Cloudinary:** Gestión de imágenes y avatares.

---

## 💻 Instalación y Configuración Local

### Prerrequisitos
- Node.js (v18+)
- PostgreSQL (Instalado y en ejecución)

### Pasos iniciales
1. Clona el repositorio.
2. Crea una base de datos en PostgreSQL llamada `pachanga`.

### 1. Configuración del Servidor (Backend)
```bash
cd server
npm install
```
- Crea un archivo `.env` en `/server` con las siguientes variables:
```env
PORT=3000
DB_NAME=pachanga
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_HOST=localhost
JWT_SECRET=tu_secreto_super_seguro
CLOUDINARY_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```
- Inicia el servidor:
```bash
npm start
```

### 2. Configuración del Cliente (Frontend)
```bash
cd client
npm install
```
- Crea un archivo `.env` en `/client`:
```env
VITE_API_URL=http://localhost:3000
```
- Inicia la aplicación:
```bash
npm run dev
```

---

## 📦 Gestión de Base de Datos
Si necesitas migrar la estructura de la base de datos:
```bash
cd server
npx sequelize-cli db:migrate
```

---

## 👥 Agrupamiento y Autoría
- **Autor:** Samir El Kharrat Martín
- **Gestión de Tareas:** [Trello](https://trello.com/invite/67ebbbf732e0ff3b7d6ba08e/ATTI78c1d2cdaab50ef9c38ecf4b2618d2c6F5C87633)
- **Diseño:** [Figma](https://www.figma.com/design/uTK3nieJuPi6RMG52Nycm0/La-Pachanga?node-id=0-1&t=UsSVvLULvHCXLTvk-1)

---
© 2026 La Pachanga - Developed with ❤️ for the LoL Community.
