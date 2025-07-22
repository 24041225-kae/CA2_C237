const express = require('express');
const multer = require("multer");
const mysql = require("mysql2");
const app = express();
const ejs =require('ejs');



const session = require("express-session");
const flash = require("connect-flash");
const e = require('connect-flash');

// const path = require('path');

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, 'public/uploads/');
//     },
//     filename: function (req, file, cb) {
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//         cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
//     }
// });
// const upload = multer({ storage: storage });

app.use(session({
    secret: 'Secret',
    resave:false,
    saveUninitialized: true,
    cookie:{maxAge:1000*24*60*7}
}))

app.use(flash());   
// app.use(express.Router())
// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.use(express.static('public')); // ✅ to serve Lottie and other assets

// MySQL connection (Uncomment and configure when ready)
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Group5@123?',
    database: 'igconnect',
    
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Database connection error:', err);
        return;
    }
    console.log('✅ Connected to MySQL database');
});


// //authutications
// const authuticationsUser=(req , res , next)=>{
//     if(req.session.user){
//         next();
//     }else{
//        req.flash('error', 'You must be logged in to access this page');
//         res.redirect('/login');
//     }
// }


// //checking Users Roles  isnt admin or normal users
// const checkUserRoles=(req , res,next)=>{
//     if(req.session.role === 'admin'){
//         res.redirect("/dashboard");
//     }
//     else{
//          next();
//     }
   
// }



// === ROUTES ===

// Routes

// app.get('/', (req, res) => {

//     res.render('logins', {success:req.flash('success'), errors: req.flash('error')}); // views/logins.ejs
// });
// app.post("/login", (req , res)=>{


// })

// app.get('/', (req, res) => {
//     res.render('home', { user: req.session.user, messages: req.flash('success')});
// });

// app.get('/login', authuticationsUser , checkUserRoles, (req, res) => {
//     res.render('login', { 
//         messages: req.flash('success'), //retrieve success messages
//         errors: req.flash('error'), //retrieve error messages
//     }); // views/login.ejs
// });

// app.post('/login', (req, res) => {
// //insert code here
// });
// // Show register page
app.get('/register', (req, res) => {
    res.render('register', {error:req.flash("error") , message : req.flash("success")}); // views/register.ejs
});

// Handle register form
app.post('/register', (req, res) => {
    const { username ,email ,  password , roles} = req.body;
    if(!username ||!email|| !password ||!roles){
        req.flash('error', 'Please fill in all fields');
        return res.redirect('/register');
    }
    sql = "INSERT INTO users (username, email , password , roles) VALUES(?,? , SHA1(?),?)";
    mysql.query(sql , [username , email , password , roles], (error , results)=>{
        if(error){
            throw error;
        }else{
            req.flash('success', 'Registration successful! You can now log in.');
            res.redirect('/login');
        }
    })
})
// });

// IG events GET route 
app.get('/events', (req, res) => {
    // Fetch events from the database
    const sql = "SELECT * FROM events";
    mysql.query(sql, (error, results) => {
        if (error) {
            req.flash('error', 'Error fetching events');
            return res.redirect('/');
        }
        res.render('events', { events: results  ,message : req.flash("success") , error:req.flash("error")}); // views/events.ejs
    });
}); 

//display each individual event
app.get('/events/:id', (req, res) => {
    const eventId  = req.params.id;
    const sql = "SELECT * FROM events WHERE id=?";
    connection.query(sql , [eventId], (error , results) => {
        if (error) {
            req.flash('error', 'Error fetching event details');
            return res.redirect('/events');
        }      
        if(results.length === 0) {
            req.flash('error', 'Event not found');
            return res.redirect('/events');
        }   
        res.render('viewsEvents', { event: results[0], message : req.flash("success") , error : req.flash("error") }); // views/eventDetails.ejs
    })
})

app.post("/events", (req , res)=>{
    //
})


// Start server
app.listen(3000, () => {
    console.log('🚀 Server is running on http://localhost:3000');
});
