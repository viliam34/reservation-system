# Room Reservation System

A modern, web-based room reservation system built with Node.js, Express, and SQLite. Features a dynamic calendar interface, multi-day reservations, and comprehensive reservation management.

## Features

### 🗓️ Interactive Calendar
- **Dynamic month navigation** with arrow controls
- **Visual reservation display** with red highlighting for booked days
- **Multi-day reservation support** spanning across date ranges
- **Calendar state preservation** when navigating between views
- **Click-to-view** reservation details

### 🏢 Multi-Location Management
- **Building, Floor, and Room selection** with dropdown menus
- **Real-time filtering** of reservations by location
- **Persistent location state** across navigation

### 📝 Reservation Management
- **Create new reservations** with single or multi-day support
- **View reservation details** by clicking calendar days
- **Edit existing reservations** with full form validation
- **Delete reservations** with confirmation dialogs
- **Contact information** and reservation naming

### 👤 User Authentication
- **Secure user registration and login**
- **Session-based authentication**
- **User-specific reservation tracking**

### 💾 Database Features
- **SQLite database** with better-sqlite3 for performance
- **Multi-day reservations** stored efficiently with date ranges
- **User management** with secure password hashing
- **Relational data structure** linking users to reservations

## Technology Stack

- **Backend**: Node.js with Express.js framework
- **Database**: SQLite with better-sqlite3
- **Authentication**: bcrypt for password hashing, JWT for sessions
- **Frontend**: Server-side rendered EJS templates
- **Styling**: Custom CSS with responsive design
- **Calendar**: Custom JavaScript implementation

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd reservation_system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Access the application**
   Open your browser to `http://localhost:3000`

## Project Structure

```
reservation_system/
├── server.js                 # Main Express server
├── package.json              # NPM dependencies and scripts
├── ourApp.db                 # SQLite database file
├── public/
│   └── styles/
│       └── dashboard.css     # Main styling
├── views/
│   ├── dashboard.ejs         # Main calendar interface
│   ├── login.ejs            # Login page
│   ├── register.ejs         # Registration page
│   ├── reservations.ejs     # User reservations list
│   └── includes/            # Reusable EJS components
│       ├── edit-reservation-form.ejs
│       ├── reservation-form.ejs
│       └── reservation-info.ejs
└── README.md                # This file
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
);
```

### Reservations Table
```sql
CREATE TABLE reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    building TEXT NOT NULL,
    floor TEXT NOT NULL,
    room TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    reservation_name TEXT NOT NULL,
    contact_info TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## API Endpoints

### Authentication
- `GET /` - Login page
- `POST /login` - User authentication
- `GET /register` - Registration page
- `POST /register` - User registration
- `GET /logout` - User logout

### Dashboard & Reservations
- `GET /dashboard` - Main calendar interface
- `POST /dashboard` - Create new reservation
- `GET /reservations` - User's reservations list
- `POST /delete-reservation/:id` - Delete reservation

## Usage Guide

### Creating a Reservation
1. Click **"New Reservation"** in the navbar
2. Select reservation mode (single date or multi-date)
3. Choose dates, times, and provide details
4. Submit the form

### Viewing Reservation Details
1. Navigate to the desired month using arrow buttons
2. Click on any **red reserved day**
3. View details in the sidebar
4. Use **Edit** or **Delete** buttons as needed

### Managing Locations
1. Use the **Building/Floor/Room** dropdowns in the sidebar
2. Calendar automatically updates to show reservations for selected location
3. Location state is preserved across all navigation

### Multi-Day Reservations
1. Select **"Multi-date reservation"** option
2. Choose start and end dates
3. System automatically reserves all days in the range
4. Calendar displays the entire range in red

## Features in Detail

### Calendar Navigation
- **Persistent State**: Calendar remembers which month you're viewing when clicking reservations
- **Smart Navigation**: Month/year preserved across all page transitions
- **Responsive Design**: Works on desktop and mobile devices

### Reservation System
- **Date Validation**: Prevents overlapping reservations and past date bookings
- **Time Management**: Configurable start and end times with validation
- **Multi-day Support**: Efficient storage and display of date ranges

### User Experience
- **Intuitive Interface**: Click-based interaction with visual feedback
- **Form Validation**: Real-time validation with error highlighting
- **Tooltips**: Hover information for reserved days
- **Confirmation Dialogs**: Safety prompts for destructive actions

## Development

### Running in Development
```bash
npm start
```

### Database Management
The SQLite database (`ourApp.db`) is created automatically on first run. To reset:
```bash
rm ourApp.db
npm start  # Database will be recreated
```

### Customization
- **Styling**: Modify `public/styles/dashboard.css`
- **Views**: Edit EJS templates in `views/` directory
- **Database**: Modify schema in `server.js` database setup section

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## License

This project is open source and available under the MIT License.

## Support

For questions or issues, please create an issue in the GitHub repository.

---

**Built with ❤️ using Node.js and Express**