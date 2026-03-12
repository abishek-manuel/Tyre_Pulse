# 🚗 TyrePulse - Smart Tyre Care Management

TyrePulse is a modern, web-based application designed to help vehicle owners monitor tyre health, track wear and tear, and manage maintenance schedules efficiently. It uses predictive logic to extend tyre lifespan and improve overall vehicle safety.

## ✨ Features
* **Smart Dashboard:** Overview of vehicle fleet health and upcoming service requirements.
* **Wear Analysis:** Predictive visual charts calculating tyre degradation based on daily driving habits.
* **Maintenance Hub:** Log and track service history (alignment, balancing, rotation).
* **Community Blog with CMS:** Users can submit articles for admin review. Only approved articles are published to the main feed.
* **AI Chatbot Assistant:** Immediate help for tyre emergencies and maintenance queries.
* **Authentication:** Secure Google and Email/Password login powered by Firebase.

## 🛠️ Technologies Used
* **Frontend:** HTML5, CSS3 (Custom Glassmorphism Design), JavaScript (ES6+)
* **UI Framework:** Bootstrap 5, Bootstrap Icons
* **Data Visualization:** Chart.js 
* **Backend / Database:** Google Firebase (Firestore DB & Firebase Authentication)

## 🚀 How to Run the Project Locally
Due to modern browser security (CORS) and Firebase integration, this project must be run on a local web server. 

### Windows Users (Easy Method)
1. Ensure you have Python installed on your machine.
2. Double-click the **`run_website.bat`** file included in the root directory.
3. The script will automatically spin up a local server and open `http://localhost:8000` in your default browser.

### Mac/Linux Users
1. Open your terminal and navigate to the project directory.
2. Run the following command: `python3 -m http.server 8000`
3. Open your browser and go to: `http://localhost:8000`

## 📁 Project Structure
- `index.html` - Landing page
- `login.html` - Firebase Auth portal
- `dashboard.html` - Main user dashboard
- `wear-analysis.html` - Chart.js predictive analysis
- `admin.html` - Content Management System for blogs
- `js/db.js` - Firebase Firestore logic
- `js/auth.js` - Firebase Authentication logic
- `style.css` - Global design system and glassmorphism styles