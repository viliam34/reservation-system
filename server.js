//2:28:24 h
// https://www.youtube.com/watch?v=1oTuMPIwHmk&t=4022s

require('dotenv').config()
const jwt = require('jsonwebtoken')
const marked = require('marked')
const sanitizeHTML = require('sanitize-html')
const express = require('express')
const cookieParser = require('cookie-parser')
const db = require('better-sqlite3')('ourApp.db')
const app = express()
const bcrypt = require('bcrypt')
const { use } = require('bcrypt/promises')


db.pragma("journal_mode = WAL")

//database setup here

const createTables = db.transaction(()=>{
    db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username STRING NOT NULL UNIQUE,
        password STRING NOT NULL 
        )
        `).run()
    db.prepare(`
        CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        createdDate TEXT,
        title STRING NOT NULL,
        body TEXT NOT NULL,
        authorid INTEGER, 
        FOREIGN KEY (authorid) REFERENCES users(id)
        )
        `).run()
    db.prepare(`
        CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        building TEXT NOT NULL,
        floor TEXT NOT NULL,
        room TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        reservation_name TEXT,
        contact_info TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `).run()
})

createTables()
//database setup ends here

app.set("view engine", "ejs")


app.use(express.static('public'));

app.use('/styles', express.static('public/styles', {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));


app.use(cookieParser())
app.use(express.urlencoded({extended:false}))
app.use(function(req,res,next){

    res.locals.filterUserHTML = function (content) {
        return sanitizeHTML(marked.parse(content), {
      allowedTags: ["p", "br", "ul", "li", "ol", "strong", "bold", "i", "em", "h1", "h2", "h3", "h4", "h5", "h6"],
      allowedAttributes: {}
    })
  }

    res.locals.errors = []
    try{
        const decoded = jwt.verify(req.cookies.ourSimpleApp,process.env.JWTSECRET)
        req.user = decoded
    } catch(err){
        req.user = false
    }

    res.locals.user = req.user
    console.log(req.user)
    next()
})
//try to decode incoming cookie



app.get('/', (req, res) => {
    if (req.user) {
        // Show dashboard with reservations for default room/floor/building
        const defaultRoom = 'room1';
        const reservations = db.prepare('SELECT r.*, u.username FROM reservations r JOIN users u ON r.user_id = u.id WHERE r.room = ? AND r.building = ? AND r.floor = ?')
          .all(defaultRoom, 'building1', 'floor1');
        return res.render("dashboard", { 
            reservations, 
            building: 'building1', 
            floor: 'floor1', 
            room: defaultRoom, 
            sidebarView: 'default', 
            selectedReservation: null 
        });
    }
    const form = req.query.form;
    res.render("home", { form });
});
app.get("/login",(req,res)=>{
    res.render("includes/login")
})
app.get("/logout", (req,res)=>{
    res.clearCookie("ourSimpleApp")
    res.redirect("/")
})


function mustBeLoggedIn(req,res,next){
    if (req.user){
        return next()
    }
    return res.redirect("/")
}

function sharedPostValidation(req){
    const errors = []

    if(typeof req.body.title != "string") req.body.title = ""
    if(typeof req.body.body != "string") req.body.body = ""

    req.body.title = sanitizeHTML(req.body.title.trim(),{allowedTags: [],allowedAttributes: {}})
    req.body.body = sanitizeHTML(req.body.body.trim(),{allowedTags: [],allowedAttributes: {}})

    if(!req.body.title) errors.push("You must provide a title")
    if(!req.body.body) errors.push("You must provide content")

    return errors
}

app.get("/create-post",mustBeLoggedIn,(req,res)=>{
    res.render("create-post")
})
app.get("/edit-post/:id",mustBeLoggedIn,(req,res)=>{
    const statement = db.prepare("SELECT * FROM posts WHERE ID = ?")
    const post = statement.get(req.params.id)


    if(!post){
        return res.redirect("/")
    }

    if(post.id !== req.user.userid){
        return res.redirect("/")
    }

    

    res.render("edit-post", {post})
})


app.post("/create-post",mustBeLoggedIn,(req,res)=>{
    const errors = sharedPostValidation(req)

    if(errors.length){
        return res.render("create-post",{errors})
    }

    const ourStatement = db.prepare("INSERT INTO posts (title, body, authorid, createdDate) VALUES (? ,? , ?, ?)")
    const result = ourStatement.run(req.body.title, req.body.body, req.user.userid, new Date().toISOString())

    const getPostStatement = db.prepare("SELECT * FROM posts WHERE ROWID = ? ")
    const realPost = getPostStatement.get(result.lastInsertRowid)

    res.redirect(`/post/${realPost.id}`)

})
app.post("/edit-post/:id",mustBeLoggedIn, (res,req)=>{
  const statement = db.prepare("SELECT * FROM posts WHERE id = ?")
  const post = statement.get(req.params.id)

  if (!post) {
    return res.redirect("/")
  }

  // if you're not the author, redirect to homepage
  if (post.authorid !== req.user.userid) {
    return res.redirect("/")
  }

  const errors = sharedPostValidation(req)

  if (errors.length) {
    return res.render("edit-post", { errors })
  }

  const updateStatement = db.prepare("UPDATE posts SET title = ?, body = ? WHERE id = ?")
  updateStatement.run(req.body.title, req.body.body, req.params.id)

  res.redirect(`/post/${req.params.id}`)
})

app.post("/delete-post/:id",mustBeLoggedIn,(req,res)=>{
  const statement = db.prepare("SELECT * FROM posts WHERE id = ?")
  const post = statement.get(req.params.id)

  if (!post) {
    return res.redirect("/")
  }

  // if you're not the author, redirect to homepage
  if (post.authorid !== req.user.userid) {
    return res.redirect("/")
  }

  const deleteStatement = db.prepare("DELETE FROM posts WHERE id = ?")
  deleteStatement.run(req.params.id)

  res.redirect("/")
})

app.get("/post/:id", (req,res)=>{
    const statement = db.prepare("SELECT * FROM posts INNER JOIN users ON posts.authorid = users.id WHERE posts.id = ?")
    const post = statement.get(req.params.id)

    if(!post){
        return res.redirect("/")
    }
    const isAuthor = post.authorid === req.user.userid

    res.render("single-post", { post,authorid })
})
app.post("/login", (req,res)=>{
    let errors = []
    if(typeof(req.body.username) !== "string") req.body.username = ""
    if(typeof(req.body.password) !== "string") req.body.password = ""

    if(req.body.username.trim() == "") errors = ("Invalid username / password")
    if(req.body.password == "") errors = ("Invalid username / password")

    if(errors.length){
        return res.render("includes/login", {errors})
    }
    
    const userInQuestionStatement = db.prepare("SELECT * FROM users WHERE USERNAME = ?")
    const userInQuestion = userInQuestionStatement.get(req.body.username)
    
    if (!userInQuestion){
        errors = ("Invalid username / password")
        return res.render("includes/login", {errors})
    }
    const matchOrNot = bcrypt.compareSync(req.body.password,userInQuestion.password)
    if(!matchOrNot){
        errors = ("Invalid username / password")
        return res.render("includes/login", {errors})
    }
    const ourTokenValue = jwt.sign({exp: Math.floor(Date.now() / 1000) + 60* 60 * 24 ,skyColor: 'blue', userid : userInQuestion.id, username: userInQuestion.username},process.env.JWTSECRET)

    res.cookie("ourSimpleApp", ourTokenValue,{
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 1000 * 60 *60 * 24
    })
    res.redirect('/')
})

app.post('/register', (req, res) => {
    const { username, password, email } = req.body;
    const errors = [];
    if (!username || !password || !email) {
        errors.push('All fields are required.');
    }
    // Check if user already exists
    const userExists = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (userExists) {
        errors.push('Username already taken.');
    }
    if (errors.length > 0) {
        return res.render('home', { form: 'register', errors });
    }
    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashedPassword);
    res.render('home', { form: 'login', success: 'Registration successful! Please log in.' });
});

app.post('/reserve', mustBeLoggedIn, (req, res) => {
    const { building, floor, room, date, 'start-date': startDate, 'end-date': endDate, start_time, end_time, reservation_name, contact_info } = req.body;
    const user_id = req.user.userid;
    
    console.log('Reservation data:', { building, floor, room, date, startDate, endDate, start_time, end_time, reservation_name, contact_info, user_id });
    
    const errors = [];
    if (!building || !floor || !room || !start_time || !end_time || !reservation_name || !contact_info) {
        errors.push('All fields are required.');
    }
    
    // Determine which dates to use
    let datesToReserve = [];
    if (date) {
        // Single date mode
        datesToReserve = [date];
    } else if (startDate && endDate) {
        // Multi-date mode - generate all dates between start and end
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (end <= start) {
            errors.push('End date must be later than start date.');
        } else {
            const currentDate = new Date(start);
            while (currentDate <= end) {
                datesToReserve.push(currentDate.toISOString().split('T')[0]);
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
    } else {
        errors.push('Please select a date or date range.');
    }
    
    // Check if dates are not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const dateStr of datesToReserve) {
        const reservationDate = new Date(dateStr);
        if (reservationDate < today) {
            errors.push('Cannot make reservations for past dates.');
            break;
        }
    }
    
    // Check if end time is later than start time
    if (start_time && end_time) {
        const startTime = new Date('2000-01-01 ' + start_time);
        const endTime = new Date('2000-01-01 ' + end_time);
        if (endTime <= startTime) {
            errors.push('End time must be later than start time.');
        }
    }
    
    // Check for conflicts with existing reservations
    if (datesToReserve.length > 0) {
        for (const dateStr of datesToReserve) {
            const existingReservations = db.prepare(
                'SELECT * FROM reservations WHERE building = ? AND floor = ? AND room = ? AND date = ? AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (start_time >= ? AND end_time <= ?))'
            ).all(building, floor, room, dateStr, start_time, start_time, end_time, end_time, start_time, end_time);
            
            if (existingReservations.length > 0) {
                errors.push(`Time conflict detected for ${dateStr}. Please choose a different time.`);
                break;
            }
        }
    }
    
    if (errors.length > 0) {
        const reservations = db.prepare('SELECT r.*, u.username FROM reservations r JOIN users u ON r.user_id = u.id WHERE r.room = ? AND r.building = ? AND r.floor = ?').all(room || 'room1', building || 'building1', floor || 'floor1');
        return res.render('dashboard', { errors, reservations, building: building || 'building1', floor: floor || 'floor1', room: room || 'room1', sidebarView: 'new-reservation', selectedReservation: null });
    }
    
    try {
        // Create a single reservation record with start and end dates
        let startDate, endDate;
        
        if (datesToReserve.length === 1) {
            // Single day reservation
            startDate = endDate = datesToReserve[0];
        } else {
            // Multi-day reservation
            startDate = datesToReserve[0];
            endDate = datesToReserve[datesToReserve.length - 1];
        }
        
        // Insert the reservation with start_date and end_date
        const insertResult = db.prepare('INSERT INTO reservations (user_id, building, floor, room, date, start_date, end_date, start_time, end_time, reservation_name, contact_info) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(user_id, building, floor, room, startDate, startDate, endDate, start_time, end_time, reservation_name, contact_info);
        
        console.log(`Reservation saved successfully: ${startDate} to ${endDate} (ID: ${insertResult.lastInsertRowid})`);
        
        // After reservation, redirect to dashboard with current selection
        res.redirect(`/dashboard?building=${encodeURIComponent(building)}&floor=${encodeURIComponent(floor)}&room=${encodeURIComponent(room)}`);
    } catch (error) {
        console.error('Error saving reservation:', error);
        const reservations = db.prepare('SELECT r.*, u.username FROM reservations r JOIN users u ON r.user_id = u.id WHERE r.room = ? AND r.building = ? AND r.floor = ?').all(room, building, floor);
        return res.render('dashboard', { errors: ['Failed to save reservation'], reservations, building, floor, room, sidebarView: 'new-reservation', selectedReservation: null });
    }
});

app.post('/edit-reservation/:id', mustBeLoggedIn, (req, res) => {
    const reservationId = req.params.id;
    const { building, floor, room, date, start_time, end_time, reservation_name, contact_info } = req.body;
    const user_id = req.user.userid;
    
    // Verify the reservation belongs to the user
    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ? AND user_id = ?').get(reservationId, user_id);
    if (!reservation) {
        return res.status(403).redirect('/dashboard');
    }
    
    const errors = [];
    if (!building || !floor || !room || !date || !start_time || !end_time || !reservation_name || !contact_info) {
        errors.push('All fields are required.');
    }
    
    // Check if date is not in the past
    const reservationDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (reservationDate < today) {
        errors.push('Cannot make reservations for past dates.');
    }
    
    // Check if end time is later than start time
    if (start_time && end_time) {
        const startTime = new Date('2000-01-01 ' + start_time);
        const endTime = new Date('2000-01-01 ' + end_time);
        if (endTime <= startTime) {
            errors.push('End time must be later than start time.');
        }
    }
    
    // Check for conflicts with other reservations (excluding this one)
    const existingReservations = db.prepare(
        'SELECT * FROM reservations WHERE building = ? AND floor = ? AND room = ? AND date = ? AND id != ? AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (start_time >= ? AND end_time <= ?))'
    ).all(building, floor, room, date, reservationId, start_time, start_time, end_time, end_time, start_time, end_time);
    
    if (existingReservations.length > 0) {
        errors.push('Time conflict detected. Please choose a different time.');
    }
    
    if (errors.length > 0) {
        const reservations = db.prepare('SELECT r.*, u.username FROM reservations r JOIN users u ON r.user_id = u.id WHERE r.room = ? AND r.building = ? AND r.floor = ?').all(room, building, floor);
        return res.render('dashboard', { errors, reservations, building, floor, room, sidebarView: 'edit-reservation', selectedReservation: reservation });
    }
    
    try {
        db.prepare('UPDATE reservations SET building = ?, floor = ?, room = ?, date = ?, start_time = ?, end_time = ?, reservation_name = ?, contact_info = ? WHERE id = ? AND user_id = ?')
            .run(building, floor, room, date, start_time, end_time, reservation_name, contact_info, reservationId, user_id);
        
        res.redirect(`/dashboard?building=${encodeURIComponent(building)}&floor=${encodeURIComponent(floor)}&room=${encodeURIComponent(room)}`);
    } catch (error) {
        console.error('Error updating reservation:', error);
        const reservations = db.prepare('SELECT r.*, u.username FROM reservations r JOIN users u ON r.user_id = u.id WHERE r.room = ? AND r.building = ? AND r.floor = ?').all(room, building, floor);
        return res.render('dashboard', { errors: ['Failed to update reservation'], reservations, building, floor, room, sidebarView: 'edit-reservation', selectedReservation: reservation });
    }
});

app.post('/delete-reservation/:id', mustBeLoggedIn, (req, res) => {
    const reservationId = req.params.id;
    const user_id = req.user.userid;
    
    // Verify the reservation belongs to the user
    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ? AND user_id = ?').get(reservationId, user_id);
    if (!reservation) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    try {
        db.prepare('DELETE FROM reservations WHERE id = ? AND user_id = ?').run(reservationId, user_id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting reservation:', error);
        res.status(500).json({ error: 'Failed to delete reservation' });
    }
});

app.get('/reservations', mustBeLoggedIn, (req, res) => {
    const user_id = req.user.userid;
    const reservations = db.prepare('SELECT * FROM reservations WHERE user_id = ?').all(user_id);
    res.render('reservations', { reservations });
});

app.post('/delete-reservation/:id', mustBeLoggedIn, (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM reservations WHERE id = ?').run(id);
    res.redirect('/reservations');
});

app.get('/dashboard', mustBeLoggedIn, (req, res) => {
    console.log('=== DASHBOARD ROUTE CALLED ===');
    console.log('Query params:', req.query);
    
    const user_id = req.user.userid;
    const building = req.query.building || 'building1';
    const floor = req.query.floor || 'floor1';
    const room = req.query.room || 'room1';
    const sidebarView = req.query.view || 'default';
    const reservationId = req.query.id;
    const selectedDate = req.query.date;
    
    console.log('Sidebar view:', sidebarView);
    console.log('Reservation ID:', reservationId);
    
    const reservations = db.prepare('SELECT r.*, u.username FROM reservations r JOIN users u ON r.user_id = u.id WHERE r.room = ? AND r.building = ? AND r.floor = ?').all(room, building, floor);
    console.log('Found reservations:', reservations.length);
    
    let selectedReservation = null;
    if (sidebarView === 'edit-reservation' || sidebarView === 'reservation-info') {
        console.log('Loading reservation details...');
        if (reservationId) {
            // Parse the reservation ID to handle quotes and convert to integer
            const cleanId = parseInt(reservationId.replace(/['"]/g, ''));
            console.log('Clean reservation ID:', cleanId);
            selectedReservation = db.prepare('SELECT r.*, u.username FROM reservations r JOIN users u ON r.user_id = u.id WHERE r.id = ?').get(cleanId);
            console.log('Selected reservation:', selectedReservation);
        } else if (selectedDate) {
            selectedReservation = db.prepare('SELECT r.*, u.username FROM reservations r JOIN users u ON r.user_id = u.id WHERE r.date = ? AND r.room = ? AND r.building = ? AND r.floor = ?').get(selectedDate, room, building, floor);
            console.log('Selected reservation by date:', selectedReservation);
        }
    }
    
    console.log('Rendering dashboard with sidebarView:', sidebarView);
    res.render('dashboard', { reservations, building, floor, room, sidebarView, selectedReservation });
});

app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000")
})