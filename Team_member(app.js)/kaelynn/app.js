// const express = require('express');
// const multer = require('multer');
// const mysql = require('mysql2');
// const app = express();

// const session = require('express-session');
// const flash = require('connect-flash');

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

// app.use(session({
//     secret: 'Secret',
//     resave:false,
//     saveUninitialized: true,
//     cookie:{maxAge:1000*60*60*24*7}
// }))
// app.use(flash());   
// app.use(express.Router())
// // Middleware setup
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.set('view engine', 'ejs');
// app.use('/public', express.static(path.join(__dirname, 'public'))); 

// // MySQL connection (Uncomment and configure when ready)
// const connection = mysql.createConnection({
//     host: 'localhost',
//     user: 'root',
//     password: 'Group5@123?',
//     database: 'igconnect',

// });

// connection.connect((err) => {
//     if (err) {
//         console.error('❌ Database connection error1:', err);
//         return;
//     }
//     console.log('✅ Connected to MySQL database1');
// });


//authentications
// const authenticationsUser=(req , res , next)=>{
//     if(req.session.user){
//         next();
//     }else{
//         req.flash('error', 'You must be logged in to access this page');
//         res.redirect('/login');
//     }
// }

// //checking Users Roles  isnt admin or normal users
// const checkUserRoles=(req , res,next)=>{
//     if(req.session.role === 'admin'){
//         res.redirect("/dashboard");
//     }
//     else{
//         next();
//     }

// }


// === ROUTES ===

// // Routes

// app.get('/', (req, res) => {

//     res.render('logins', {success:req.flash('success'), errors: req.flash('error')}); // views/logins.ejs
// });
// app.post("/login", (req , res)=>{


// })

// // app.get('/', (req, res) => {
// //     res.render('home', { user: req.session.user, messages: req.flash('success')});
// // });

// app.get('/login', authenticationsUser , checkUserRoles, (req, res) => {
//     res.render('login', { 
//         messages: req.flash('success'), //retrieve success messages
//         errors: req.flash('error'), //retrieve error messages
//     }); // views/login.ejs
// });

// app.post('/login', (req, res) => {
// //insert code here
// });
// // Show register page
// app.get('/register', (req, res) => {
//     res.render('register'); // views/register.ejs
// });

// // Handle register form
// app.post('/register', (req, res) => {
//     const { username ,email ,  password , roles} = req.body;
//     if(!username ||!email|| !password ||!roles){
//         req.flash('error', 'Please fill in all fields');
//         return res.redirect('/register');
//     }
//     sql = "INSERT INTO users (username, email , password , roles) VALUES(?,? , SHA1(?),?)";
//     mysql.query(sql , [username , email , password , roles], (error , results)=>{
//         if(error){
//             throw error;
//         }else{
//             req.flash('success', 'Registration successful! You can now log in.');
//             res.redirect('/login');
//         }
//     })

// });

// // Show dashboard (after login)
// app.get('/dashboard', (req, res) => {
// const search = req.query.search || '';
// const sql = "SELECT * FROM cca_entries WHERE title LIKE ?";
// connection.query(sql, [`%${search}%`], (err, results) => {
// if (err) {
//     console.error('Error retrieving CCA entries:', err.message);
//     return res.status(500).send('Error loading dashboard');
// }
// res.render('dashboard', { entries: results, search: search });
// });
// });

// app.get('/editCCA/:id', (req, res) => {
//     const ccaId = req.params.id;
//     connection.query('SELECT * FROM cca_entries WHERE id = ?', [ccaId], (err, result) => {
//         if (err) {
//             return res.status(500).send("Error loading entry");
//         }
//         res.render('editCCA', { entry: result[0] });
//     });
// });

// app.post('/editCCA/:id', upload.single('file'), (req, res) => {
//     const ccaId = req.params.id;
//     const { title, date, role, hours, description, category, feedback } = req.body;
//     const file = req.file ? req.file.filename : null;

//     // Build SQL dynamically
//     let sql = `UPDATE cca_entries SET title = ?, date = ?, role = ?, hours = ?, category = ?, description = ?, feedback = ?`;
//     const values = [title, date, role, hours, category, description, feedback];

//     if (file) {
//         sql += `, proof_file = ?`;
//         values.push(file);
//     }

//     sql += ` WHERE id = ?`;
//     values.push(ccaId);

//     connection.query(sql, values, (error, results) => {
//         if (error) {
//             console.error('❌ Error updating CCA entry:', error.message);
//             return res.status(500).send('Error updating CCA entry');
//         }
//         res.redirect('/dashboard');
//     });
// });

// ///////////////////////////
// //mine start
// ///////////////////////////



// students

// View students
app.get('/students', authenticationsUser, (req, res) => {
    connection.query('SELECT * FROM students', (err, results) => {
        if (err) return res.status(500).send('Error retrieving students');
        res.render('students_list', { students: results });
    });
});

// Search by name
app.post('/students/search', authenticationsUser, (req, res) => {
    const { name } = req.body;
    connection.query('SELECT * FROM students WHERE name LIKE ?', [`%${name}%`], (err, results) => {
        if (err) return res.status(500).send('Search error');
        res.render('students_list', { students: results });
    });
});

// Add student
app.get('/students/add', authenticationsUser, (req, res) => {
    res.render('students_add');
});

app.post('/students/add', upload.single('profile_pic'), authenticationsUser, (req, res) => {
    const { name, school_id, email, interests } = req.body;
    const profile_pic = req.file ? `/uploads/${req.file.filename}` : null;

    const sql = 'INSERT INTO students (name, school_id, email, interests, profile_pic) VALUES (?, ?, ?, ?, ?)';
    connection.query(sql, [name, school_id, email, interests, profile_pic], (err) => {
        if (err) 
            return res.status(500).send('Insert error');
        res.redirect('/students');
    });
});

// Edit student
app.get('/students/edit/:id', authenticationsUser, (req, res) => {
    connection.query('SELECT * FROM students WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).send('Load error');
        res.render('students_edit', { student: results[0] });
    });
});

app.post('/students/edit/:id', upload.single('profile_pic'), authenticationsUser, (req, res) => {
    const { name, school_id, email, interests } = req.body;
    const profile_pic = req.file ? `/uploads/${req.file.filename}` : null;

    let sql = 'UPDATE students SET name=?, school_id=?, email=?, interests=?';
    const values = [name, school_id, email, interests];

    if (profile_pic) {
        sql += ', profile_pic=?';
        values.push(profile_pic);
    }

    sql += ' WHERE id=?';
    values.push(req.params.id);

    connection.query(sql, values, (err) => {
        if (err) return res.status(500).send('Update error');
        res.redirect('/students');
    });
});

// Delete
app.get('/students/delete/:id', authenticationsUser, (req, res) => {
    connection.query('DELETE FROM students WHERE id=?', [req.params.id], (err) => {
        if (err) return res.status(500).send('Delete error');
        res.redirect('/students');
    });
});

//student routes

// achievements routes

// View achievements
app.get('/achievements', authenticationsUser, (req, res) => {
    const sql = `SELECT sa.*, s.name FROM student_achievements sa JOIN students s ON sa.student_id = s.id`;
    connection.query(sql, (err, results) => {
        if (err) return res.status(500).send('Achievements error');
        res.render('achievements_list', { achievements: results });
    });
});

// Add form
app.get('/achievements/add', authenticationsUser, (req, res) => {
    connection.query('SELECT id, name FROM students', (err, students) => {
        if (err) return res.status(500).send('Student fetch error');
        res.render('achievements_add', { students });
    });
});

// Add achievement
app.post('/achievements/add', authenticationsUser, (req, res) => {
    const { student_id, title, description, date_awarded } = req.body;
    const sql = 'INSERT INTO student_achievements (student_id, title, description, date_awarded) VALUES (?, ?, ?, ?)';
    connection.query(sql, [student_id, title, description, date_awarded], (err) => {
        if (err) return res.status(500).send('Insert error');
        res.redirect('/achievements');
    });
});

// Edit form
app.get('/achievements/edit/:id', authenticationsUser, (req, res) => {
    connection.query('SELECT * FROM student_achievements WHERE id = ?', [req.params.id], (err1, achievement) => {
        if (err1) return res.status(500).send('Load error');
        connection.query('SELECT id, name FROM students', (err2, students) => {
            if (err2) return res.status(500).send('Student list error');
            res.render('achievements_edit', { achievement: achievement[0], students });
        });
    });
});

// Edit post
app.post('/achievements/edit/:id', authenticationsUser, (req, res) => {
    const { student_id, title, description, date_awarded } = req.body;
    const sql = 'UPDATE student_achievements SET student_id=?, title=?, description=?, date_awarded=? WHERE id=?';
    connection.query(sql, [student_id, title, description, date_awarded, req.params.id], (err) => {
        if (err) return res.status(500).send('Update error');
        res.redirect('/achievements');
    });
});

// Delete
app.get('/achievements/delete/:id', authenticationsUser, (req, res) => {
    connection.query('DELETE FROM student_achievements WHERE id=?', [req.params.id], (err) => {
        if (err) return res.status(500).send('Delete error');
        res.redirect('/achievements');
    });
});

////////////////////////////////
//my one
////////////////////////////////
// Start server

// app.listen(3000, () => {
//     console.log('🚀 Server is running on http://localhost:3000');
// });
