Mountain Bike Race System Documentation
Overview
The Mountain Bike Race System is a comprehensive platform designed to manage mountain bike races, riders, and administrative tasks. It provides features for race creation, rider registration, live standings, race results, and administrative controls. The system is built using Node.js, Express.js, and MongoDB, with a modular architecture for scalability and maintainability. <hr></hr>
Key Features
Race Management
Create, Update, and Delete Races: Manage race details such as name, location, distance, terrain, and difficulty.
Race Status Management: Transition races through statuses like Draft, Open, InProgress, Completed, and Cancelled.
Live Standings: Fetch real-time standings during a race.
Race Reports: Generate detailed reports, including top performers, completion rates, and weather conditions.
Rider Management
Rider Registration: Register riders for races with eligibility checks.
Search Riders: Search for riders by name, email, or nationality.
Update Rider Details: Modify rider information such as category, bike type, and emergency contact.
Weather Integration
Current Weather: Fetch real-time weather data for race locations.
Forecast: Retrieve weather forecasts for upcoming races.
Authentication & Authorization
Admin Authentication: Secure login for administrators with JWT-based authentication.
Role-Based Access Control: Restrict access to admin-only features.
Email Verification: Ensure secure admin account creation with email verification.
Reporting & Analytics
Race Statistics: Analyze race completion rates, average times, and participant statuses.
Top Performers: Identify the top 3 fastest riders in a race.
DNF/DSQ Analysis: Track riders who did not finish or were disqualified.
<hr></hr>
Technology Stack
Backend
Node.js: JavaScript runtime for server-side development.
Express.js: Web framework for building RESTful APIs.
MongoDB: NoSQL database for storing race, rider, and admin data.
Libraries & Tools
Mongoose: ODM for MongoDB.
Joi: Data validation library.
bcrypt.js: Password hashing.
jsonwebtoken: Token-based authentication.
axios: HTTP client for external API calls (e.g., weather data).
<hr></hr>
Project 
