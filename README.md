#  Mountain Bike Race System

##  Overview

A backend system for managing **mountain bike races, riders, and results**, built with **Node.js, Express.js, MongoDB**, and **OpenWeatherMap API**.

---

##  Features

* **Race Management:** Create, update, delete races, track statuses, live standings, and reports.
* **Rider Management:** Register riders, update details, and search by name/email/nationality.
* **Weather Integration:** Real-time & forecast weather for race locations.
* **Authentication:** JWT-based admin login, email verification, role-based access.
* **Reports & Analytics:** Top 3 fastest riders, riders who did not finish/participate, completion stats.

---

## Tech Stack

* **Backend:** Node.js, Express.js, MongoDB
* **Libraries:** Mongoose, Joi, bcrypt.js, jsonwebtoken, axios

---

## Setup

1. Clone repo:

   ```bash
   git clone https://github.com/KevinEjiofor/mountain-bike-race-system.git
   cd mountain-bike-race-system
   ```
2. Install dependencies:

   ```bash
   npm install
   ```
3. Add `.env` file:

   ```env
   MONGO_URI=your_mongo_connection_string
   JWT_SECRET=your_jwt_secret
   WEATHER_API_KEY=your_openweathermap_api_key
   PORT=5050
   ```
4. Run app:

   ```bash
   npm start
   ```

   Base URL: `http://localhost:5050`

---

##  Key Endpoints

### Admin

* `POST /api/admin/login` – Admin login
* `POST /api/admin/register` – Register admin
* `POST /api/admin/verify-email` – Verify admin email

### Riders

* `GET /api/riders` – All riders
* `POST /api/riders` – Create rider
* `PUT /api/riders/:id` – Update rider

### Races

* `GET /api/races` – All races
* `POST /api/races` – Create race
* `PUT /api/races/:id` – Update race
* `GET /api/races/:id/standings` – Live standings

---

##  Testing

Run unit tests:

```bash
npm test
```
