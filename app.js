const express = require('express');
const multer = require("multer");
const mysql = require("mysql2");
const session = require('express-session');
const flash = require("connect-flash");
const path = require('path');
const validator = require('validator');
const app = express();
const moment = require('moment'); // npm install moment
    const checkDiskSpace = require('check-disk-space').default;
app.use(express.urlencoded({ extended: true }));

// MySQL Setup
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Group5@123?',
  database: 'igconnect'
});
connection.connect(err => {
  if (err) return console.error('❌ MySQL error:', err);
  console.log('✅ MySQL connected');
});

// Multer Setup (for image uploads)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'proof-' + unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Middleware Setup
app.use(session({
  secret: 'Secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use(flash());
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.static('public'));

// ---------- Middleware ----------
const authUser = (req, res, next) => {
  if (req.session.user) return next();
  req.flash("errorMsg", "Please log in to access this page.");
  return res.redirect('/login');
};

const authAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.roles === 'admin') return next();
  req.flash("errorMsg", "Access denied. Admins only.");
  return res.redirect('/login');

};// ✅ View All Announcements (Manage Page)
app.get('/admin/announcements', (req, res) => {
  connection.query('SELECT * FROM announcements ORDER BY created_at DESC', (err, results) => {
    if (err) {
      req.flash('error', 'Failed to load announcements.');
      return res.redirect('/admin');
    }
    res.render('admin/manageAnnouncements', { announcements: results });
  });
});

// ✅ Show Add Announcement Form
app.get('/admin/announcements/add', (req, res) => {
  res.render('admin/addAnnouncement');
});

// ✅ Handle Add Announcement Submission
app.post('/admin/announcements/add', (req, res) => {
  const { title, message, target_audience } = req.body;

  connection.query(
    'INSERT INTO announcements (title, message, target_audience, created_at) VALUES (?, ?, ?, NOW())',
    [title, message, target_audience],
    (err) => {
      if (err) {
        req.flash('error', 'Failed to add announcement.');
        return res.redirect('/admin/announcements');
      }
      req.flash('success', 'Announcement added successfully!');
      res.redirect('/admin/announcements');
    }
  );
});

// ✅ Show Edit Announcement Form
app.get('/admin/announcements/edit/:id', (req, res) => {
  const id = req.params.id;

  connection.query('SELECT * FROM announcements WHERE id = ?', [id], (err, results) => {
    if (err || results.length === 0) {
      req.flash('error', 'Announcement not found.');
      return res.redirect('/admin/announcements');
    }
    res.render('admin/editAnnouncement', { announcement: results[0] });
  });
});

// ✅ Handle Edit Submission
app.post('/admin/announcements/edit/:id', (req, res) => {
  const id = req.params.id;
  const { title, message, target_audience } = req.body;

  connection.query(
    'UPDATE announcements SET title = ?, message = ?, target_audience = ? WHERE id = ?',
    [title, message, target_audience, id],
    (err) => {
      if (err) {
        req.flash('error', 'Failed to update announcement.');
        return res.redirect('/admin/announcements');
      }
      req.flash('success', 'Announcement updated successfully!');
      res.redirect('/admin/announcements');
    }
  );
});

// ✅ Handle Delete
app.post('/admin/announcements/delete/:id', (req, res) => {
  const id = req.params.id;

  connection.query('DELETE FROM announcements WHERE id = ?', [id], (err) => {
    if (err) {
      req.flash('error', 'Failed to delete announcement.');
    } else {
      req.flash('success', 'Announcement deleted successfully!');
    }
    res.redirect('/admin/announcements');
  });
});


//SITI 
// --- IG CATEGORIES ROUTES ---
// View all IG categories 
app.get('/ig_categories', (req, res) => {
    const { name } = req.query;
    let sql = 'SELECT * FROM ig_categories';
    const queryParams = [];
    let searchPerformed = false;

    if (name) {
        sql += ' WHERE name LIKE ?';
        queryParams.push(`%${name}%`);
        searchPerformed = true;
    }

    connection.query(sql, queryParams, (error, results) => {
        if (error) {
            console.error('Error fetching IG categories:', error);
            req.flash('error', 'Error fetching IG categories: ' + error.message);
            return res.redirect('/');
        }
        res.render('Admin/ManageCategories(siti)', {
          messages : req.flash("success", ""),
          errors: req.flash("error", ""),
          categories:results
        }
          
        );
    });
});

// Add new IG category form
app.get('/Admin/addIgCategory', (req, res) => {
  res.render('Admin/AddIG', {
    messages : req.flash("success", ""),
          errors: req.flash("error", ""),
  }); // ✅ CORRECTED: Removed leading slash
});

// Add new IG category
app.post('/Admin/addIgCategory', (req, res) => {
    const { name, description } = req.body;
    if (!name) {
        req.flash('error', 'Category Name is required.');
        return res.redirect('/Admin/addIgCategory');
    }
    const sql = 'INSERT INTO ig_categories (name, description) VALUES (?, ?)';
    connection.query(sql, [name, description], (error, results) => {
        if (error) {
            console.error('Error adding IG category:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                req.flash('error', 'Category with this name already exists.');
                return res.redirect('/Admin/addIgCategory');
            }
            req.flash('error', 'Error adding IG category: ' + error.message);
            return res.redirect('/Admin/addIgCategory');
        }
        req.flash('success', 'IG Category added successfully!');
        res.redirect('/ig_categories');
    });
});

// Get data for updating an IG category
app.get('/Admin/updateIgCategory/edit/:id', (req, res) => {
    const categoryId = req.params.id;
    connection.query('SELECT * FROM ig_categories WHERE id = ?', [categoryId], (error, results) => {
        if (error) {
            console.error('Error fetching IG category for update:', error);
            req.flash('error', 'Error fetching IG category: ' + error.message);
            return res.redirect('/ig_categories');
        }
        if (results.length > 0) {
            res.render('updateIgCategory', {
                igCategory: results[0]
            });
        } else {
            req.flash('error', 'IG Category not found.');
            res.redirect('/ig_categories');
        }
    });
});

// Update IG category
app.post('/Admin/updateIgCategory/edit/:id', (req, res) => {
    const categoryId = req.params.id;
    const { name, description } = req.body;
    if (!name) {
        req.flash('error', 'Category Name is required for update.');
        return res.redirect(`/updateIgCategory/${categoryId}`);
    }
    const sql = 'UPDATE ig_categories SET name = ?, description = ? WHERE id = ?';
    connection.query(sql, [name, description, categoryId], (error, results) => {
        if (error) {
            console.error('Error updating IG category:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                req.flash('error', 'Category with this name already exists.');
                return res.redirect(`/updateIgCategory/${categoryId}`);
            }
            req.flash('error', 'Error updating IG category: ' + error.message);
            return res.redirect('/ig_categories');
        }
        if (results.affectedRows === 0) {
            req.flash('error', 'IG Category not found or no changes made.');
        } else {
            req.flash('success', 'IG Category updated successfully!');
        }
        res.redirect('/ig_categories');
    });
});

// Delete IG category
app.get('/admin/manage-categories/delete/:id', (req, res) => {
    const categoryId = req.params.id;


    connection.query('DELETE FROM ig_categories WHERE id = ?', [categoryId], (error, results) => {
        if (error) {
            console.error('Error deleting IG category:', error);
            req.flash('error', 'Error deleting IG category: ' + error.message);
            return res.redirect('/ig_categories');
        }
        if (results.affectedRows === 0) {
            req.flash('error', 'IG Category not found for deletion.');
        } else {
            req.flash('success', 'IG Category deleted successfully!');
        }
        res.redirect('/ig_categories');
    });
});

// app.get("/admin/events", authAdmin, (req, res) => {
//   const sqlEvents = `
//     SELECT e.id, e.name, e.date, e.description, ig.name AS ig_name
//     FROM events e
//     INNER JOIN interest_groups ig ON e.ig_id = ig.id
//     ORDER BY e.date ASC`;


//   const sqlIGs = `SELECT id, name FROM interest_groups`;

//   connection.query(sqlEvents, (errEvents, eventResults) => {
//     if (errEvents) {
//       console.error("❌ Error fetching events:", errEvents);
//       req.flash("errorMsg", "Failed to retrieve events.");
//       return res.render("ManageAdminEvents", {
//         eventList: [],
//         igList: [],
//         successMsg: req.flash("successMsg"),
//         errorMsg: req.flash("errorMsg")
//       });
//     }

//     connection.query(sqlIGs, (errIGs, igResults) => {
//       if (errIGs) {
//         console.error("❌ Error fetching IGs:", errIGs);
//         req.flash("errorMsg", "Failed to retrieve IG list.");
//         return res.render("ManageAdminEvents", {
//           eventList: eventResults,
//           igList: [],
//           successMsg: req.flash("successMsg"),
//           errorMsg: req.flash("errorMsg")
//         });
//       }

//       res.render("AddAdminEvents", {
//         eventList: eventResults,
//         igList: igResults,
//         successMsg: req.flash("successMsg"),
//         errorMsg: req.flash("errorMsg")
//       });
//     });
//   });
// });

// app.get("/admin/events", (req, res) => {
//   const sql = `SELECT events.*, interest_groups.name 
//                FROM events 
//                INNER JOIN interest_groups ON events.ig_id = interest_groups.id`;
//   connection.query(sql, (err, results) => {
//     if (err) throw err;
//     res.render("ManageEventsAdmin", { eventList: results });
//   });
// });
app.get('/admin/gallery', (req, res) => {
  const query = `
    SELECT g.*, s.name AS student_name, ig.name AS ig_name 
    FROM galleries g 
    JOIN students s ON g.student_id = s.id 
    JOIN interest_groups ig ON g.ig_id = ig.id 
    ORDER BY g.created_at DESC
  `;
  connection.query(query, (err, results) => {
    if (err) {
      req.flash('message', 'Error loading gallery.');
      return res.redirect('/admin');
    }
    res.render('Admin/ManageGallery', {
      galleryList: results,
      message: req.flash('message'),
      successMsg: req.flash('successMsg')
    });
  });
});



// ---------- Logout ----------
app.get("/logout", (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        console.error('❌ Session destruction error:', err);
        return res.redirect('/home');
      }
      res.redirect('/login');      
      req.flash("successMsg", "You have been logged out successfully.");

    });
  } else {
    return res.redirect('/login');
  }
});

// GET Add Gallery page
app.get('/admin/gallery/add', async (req, res) => {
  const [igs] = await connection.promise().query('SELECT * FROM interest_groups');
  const [students] = await connection.promise().query('SELECT * FROM students');
  res.render('Admin/AddGallery', {
    igs,
    students,
    message: req.flash('message'),
    successMsg: req.flash('successMsg')
  });
});
// 🧠 Route: GET /admin/students
app.get("/admin/students", (req, res) => {
  const sql = "SELECT * FROM students ORDER BY name ASC";
  connection.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching students:", err);
      req.flash("message", "Failed to load student list.");
      return res.render("admin/manageStudents", { studentList: [], message: req.flash("message"), successMsg: [] });
    }

    res.render("AdminManageStudent", {
      studentList: results,
      message: req.flash("message"),
      successMsg: req.flash("successMsg")
    });
  });
});

// 🔴 Optional: POST /admin/students/delete/:id
app.post("/admin/students/delete/:id", (req, res) => {
  const studentId = req.params.id;
  const sql = "DELETE FROM students WHERE id = ?";
  connection.query(sql, [studentId], (err, result) => {
    if (err) {
      req.flash("message", "Error deleting student.");
    } else {
      req.flash("successMsg", "Student deleted successfully.");
    }
    res.redirect("/admin/students");
  });
});
app.post('/admin/gallery/add', upload.single('media'), (req, res) => {
  const { title, caption, student_id, ig_id } = req.body;
  const media_url = req.file ? '/uploads/' + req.file.filename : null;

  if (!title || !caption || !student_id || !ig_id || !media_url) {
    req.flash('message', 'All fields are required.');
    return res.redirect('/admin/gallery');
  }

  const query = `
    INSERT INTO galleries (title, caption, media_url, upload_date, created_at, student_id, ig_id)
    VALUES (?, ?, ?, NOW(), NOW(), ?, ?)
  `;

  connection.query(query, [title, caption, media_url, student_id, ig_id], (err, result) => {
    if (err) {
      console.error(err);
      req.flash('message', 'Error adding gallery entry.');
      return res.redirect('/admin/gallery');
    }
    req.flash('successMsg', 'Gallery added successfully.');
    res.redirect('/admin/gallery');
  });
});


app.get('/admin/gallery/add', (req, res) => {
  const userId = req.session.user?.id || 1; // fallback for now
  connection.query('SELECT id, name FROM interest_groups', (err, igs) => {
    if (err) throw err;
    res.render('AdminAddGallery', { igs, userId });
  });
});


// ---------- Home ----------
app.get('/', (req, res) => res.redirect('/login'));
app.get('/home', (req, res) => res.render('studentdashboard'));

// ---------- Login ----------
app.get('/login', (req, res) => {
  res.render('login', {
    successMsg: req.flash('successMsg'),
    errorMsg: req.flash('errorMsg')
  });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    req.flash('errorMsg', 'Please fill in all fields.');
    return res.redirect('/login');
  }

  if (!validator.isEmail(email)) {
    req.flash('errorMsg', 'Invalid email format.');
    return res.redirect('/login');
  }

  const sql = "SELECT * FROM users WHERE email = ? AND password = SHA1(?)";
  connection.query(sql, [email, password], (err, results) => {
    if (err) {
      req.flash('errorMsg', 'Database error');
      return res.redirect('/login');
    }
    if (results.length > 0) {
      req.session.user = results[0];
      req.flash('successMsg', 'Login successful!');
      return res.redirect(results[0].roles === 'admin' ? '/admin' : '/studentdashboard');
    } else {
      req.flash('errorMsg', 'Invalid email or password');
      return res.redirect('/login');
    }
  });
});

// ---------- Register ----------
app.get('/register', (req, res) => {
  res.render('register', {
    successMsg: req.flash('successMsg'),
    errorMsg: req.flash('errorMsg')
  });
});

app.post('/register', (req, res) => {
  const { username, email, password, roles } = req.body;

  if (!username || !email || !password || !roles) {
    req.flash('errorMsg', 'Please fill in all fields.');
    return res.redirect('/register');
  }

  if (!validator.isEmail(email)) {
    req.flash('errorMsg', 'Invalid email format.');
    return res.redirect('/register');
  }

  const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{8,}$/;
  if (!strongPassword.test(password)) {
    req.flash('errorMsg', 'Password must include uppercase, lowercase, number, symbol.');
    return res.redirect('/register');
  }

  const checkSql = "SELECT * FROM users WHERE email = ?";
  connection.query(checkSql, [email], (err, results) => {
    if (results.length > 0) {
      req.flash('errorMsg', 'Email already exists.');
      return res.redirect('/register');
    }

    const insertSql = "INSERT INTO users (username, email, password, roles) VALUES (?, ?, SHA1(?), ?)";
    connection.query(insertSql, [username, email, password, roles], (error) => {
      if (error) {
        req.flash('errorMsg', 'Database error.');
        return res.redirect('/register');
      }
      req.flash('successMsg', 'Registration successful! Please log in.');
      return res.redirect('/login');
    });
  });
});

// ---------- Reset Password ----------
app.get('/reset-password', (req, res) => {
  res.render('reset-password', {
    successMsg: req.flash('successMsg'),
    errorMsg: req.flash('errorMsg')
  });
});

app.post('/reset-password', (req, res) => {
  const { email, newPassword, confirmPassword } = req.body;

  if (!email || !newPassword || !confirmPassword) {
    req.flash('errorMsg', 'Please fill in all fields.');
    return res.redirect('/reset-password');
  }

  if (!validator.isEmail(email)) {
    req.flash('errorMsg', 'Invalid email format.');
    return res.redirect('/reset-password');
  }

  const checkUserSql = "SELECT * FROM users WHERE email = ?";
  connection.query(checkUserSql, [email], (err, results) => {
    if (err) {
      req.flash('errorMsg', 'Database error occurred.');
      return res.redirect('/reset-password');
    }

    if (results.length === 0) {
      req.flash('errorMsg', 'No account found with that email.');
      return res.redirect('/reset-password');
    }

    if (newPassword !== confirmPassword) {
      req.flash('errorMsg', 'Passwords do not match.');
      return res.redirect('/reset-password');
    }

    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{8,}$/;
    if (!strongPassword.test(newPassword)) {
      req.flash('errorMsg', 'Password must include uppercase, lowercase, number, symbol.');
      return res.redirect('/reset-password');
    }

    const updateSql = "UPDATE users SET password = SHA1(?) WHERE email = ?";
    connection.query(updateSql, [newPassword, email], (err) => {
      if (err) {
        req.flash('errorMsg', 'Failed to update password.');
        return res.redirect('/reset-password');
      }

      req.flash('successMsg', 'Password updated successfully! You may now log in.');
      return res.redirect('/login');
    });
  });
});


// app.get("/admin/interest-groups/add", authAdmin, (req, res) => {
//   res.render("AddIGAdmin", {
//     successMsg: req.flash("successMsg"),
//     errorMsg: req.flash("errorMsg")
//   });
// })

app.get('/admin/events', (req, res) => {
  const sql = `
    SELECT events.*, interest_groups.name AS ig_name
    FROM events
    JOIN interest_groups ON events.ig_id = interest_groups.id
  `;

  connection.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error fetching events:', err);
      return res.status(500).send("Server error.");
    }
    res.render('Admin/ManageEvents', { eventList: results });
  });
});


app.get('/admin/events/add', (req, res) => {
  connection.query('SELECT * FROM interest_groups', (err, igList) => {
    if (err) return res.send('Failed to load IG list');
    res.render('Admin/AddEvents', { igList });
  });
});

// Handle Add Event Submission
app.post('/admin/events/add', (req, res) => {
  const { name, date, location, ig_id, description } = req.body;
  const sql = `INSERT INTO events (name, date, location, ig_id, description) 
               VALUES (?, ?, ?, ?, ?)`;
  connection.query(sql, [name, date, location, ig_id, description], (err) => {
    if (err) return res.send('Failed to add event');
    res.redirect('/admin/events');
  });
});
// GET: Edit event form
app.get('/admin/events/edit/:id', (req, res) => {
  const eventId = req.params.id;
  const query = 'SELECT * FROM events WHERE id = ?';
  const igQuery = 'SELECT id, igName FROM igs';

  connection.query(query, [eventId], (err, eventResults) => {
    if (err || eventResults.length === 0) return res.send("Event not found");

    connection.query(igQuery, (igErr, igResults) => {
      if (igErr) return res.send("Failed to load IG list");

      res.render('admin/editEvent', {
        event: eventResults[0],
        igList: igResults
      });
    });
  });
});

// POST: Update event
app.post('/admin/events/edit/:id', (req, res) => {
  const eventId = req.params.id;
  const { name, date, location, ig_id, description } = req.body;
  const query = `
    UPDATE events
    SET name = ?, date = ?, location = ?, ig_id = ?, description = ?
    WHERE id = ?
  `;

  connection.query(query, [name, date, location, ig_id, description, eventId], (err) => {
    if (err) {
      console.error(err);
      req.flash('error', 'Failed to update event');
    } else {
      req.flash('success', 'Event updated successfully');
    }
    res.redirect('/admin/events');
  });
});


// Delete Event
app.post('/admin/events/delete/:id', (req, res) => {
  const eventId = req.params.id;
  connection.query('DELETE FROM events WHERE id = ?', [eventId], (err) => {
    if (err) return res.send('Failed to delete event');
    res.redirect('/admin/events');
  });
});



// GET: Admin profile settings
app.get('/admin/profile', (req, res) => {
  const adminId = req.session.user.id;
  console.log(`Admin ID: ${adminId}`); // Debugging line
  connection.query('SELECT * FROM users WHERE id = ?', [adminId], (err, results) => {
    if (err || results.length === 0) return res.redirect('/admin');
    res.render('Admin/profileSettings', {
      admin: results[0],
      success: req.flash('success'),
      error: req.flash('error')
    });
  });
});

// POST: Update admin profile
app.post('/admin/profile/update', upload.single('profile_image'), (req, res) => {
  const { fullname, email, password } = req.body;
  const adminId = req.session.userId;

  // Optional profile image
  const profile_image = req.file ? req.file.filename : null;

  // Prepare update fields
  let updateFields = [];
  let values = [];

  if (fullname) {
    updateFields.push('fullname = ?');
    values.push(fullname);
  }

  if (email) {
    updateFields.push('email = ?');
    values.push(email);
  }

  if (password) {
    const hashed = bcrypt.hashSync(password, 10);
    updateFields.push('password = ?');
    values.push(hashed);
  }

  if (profile_image) {
    updateFields.push('profile_image = ?');
    values.push(profile_image);
  }

  if (updateFields.length === 0) {
    req.flash('error', 'No changes made.');
    return res.redirect('/admin/profile');
  }

  const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
  values.push(adminId);

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error(err);
      req.flash('error', 'Something went wrong.');
      return res.redirect('/admin/profile');
    }

    req.flash('success', 'Profile updated successfully.');
    res.redirect('/admin/profile');
  });
});

app.get('/admin/manage-categories', (req, res) => {
  connection.query('SELECT * FROM ig_categories', (err, results) => {
    if (err) {
      req.flash('error', 'Error loading categories');
      return res.render('Admin/ManageCategories', { categories: [], messages: req.flash() });
    }
    res.render('Admin/ManageCategories(siti)', { categories: results, messages: req.flash() , errors:req.flash()});
  });
});

// ✅ Add IG Category
app.post('/admin/manage-categories/add', (req, res) => {
  const { category_name } = req.body;
  connection.query('INSERT INTO ig_categories (name) VALUES (?)', [category_name], err => {
    if (err) req.flash('error', 'Failed to add category');
    else req.flash('success', 'Category added');
    res.redirect('/admin/manage-categories');
  });
});

// ✅ Edit IG Category
app.post('/admin/manage-categories/edit/:id', (req, res) => {
  const { id } = req.params;
  const { category_name } = req.body;
connection.query('UPDATE ig_categories SET name = ? WHERE id = ?', [category_name, id], err => {
    if (err) req.flash('error', 'Failed to update category');
    else req.flash('success', 'Category updated');
    res.redirect('/admin/manage-categories');
  });
});

// ✅ Delete IG Category
app.post('/admin/manage-categories/delete/:id', (req, res) => {
  const { id } = req.params;
  connection.query('DELETE FROM ig_categories WHERE id = ?', [id], err => {
    if (err) req.flash('error', 'Failed to delete category');
    else req.flash('success', 'Category deleted');
    res.redirect('/admin/manage-categories');
  });
});


























// Admin Dashboard Route
app.get("/admin", authAdmin, async (req, res) => {
  try {
    // 🧠 System Health
    const serverStatus = '✅ Online';
    const start = Date.now();
    await connection.promise().query('SELECT 1');
    const dbLatency = Date.now() - start;

    let storageUsage = 'Unavailable';
    try {
      const disk = await checkDiskSpace('C:/');
      const total = disk.size;
      const used = total - disk.free;
      storageUsage = `${((used / total) * 100).toFixed(1)}% full`;
    } catch (err) {
      console.error('Disk usage error:', err);
      storageUsage = 'Error retrieving';
    }

    const lastBackup = '20 July 2025'; // Example value

    // 📥 Recent Activities
    const [recentMembers] = await connection.promise().query(`
      SELECT s.name AS student_name, ig.name AS ig_name, m.created_at
      FROM members m
      JOIN students s ON m.student_id = s.id
      JOIN interest_groups ig ON m.ig_id = ig.id
      ORDER BY m.created_at DESC
      LIMIT 3
    `);

    const [recentIGUpdates] = await connection.promise().query(`
      SELECT name, updated_at FROM interest_groups
      ORDER BY updated_at DESC
      LIMIT 3
    `);

    const [recentGallery] = await connection.promise().query(`
      SELECT s.name AS uploaded_by, g.created_at
      FROM galleries g
      JOIN students s ON g.student_id = s.id
      ORDER BY g.created_at DESC
      LIMIT 3
    `);

    const [totalAnnouments] = await connection.promise().query('SELECT COUNT(*) AS count FROM announcements');

    // 🗂 Activity Feed (Safe moment usage)
    const activityFeed = [];

    recentMembers.forEach(m => {
      activityFeed.push({
        msg: `${m.student_name} requested to join ${m.ig_name} IG`,
        time: moment(m.created_at),
        timeText: moment(m.created_at).fromNow()
      });
    });

    recentIGUpdates.forEach(i => {
      activityFeed.push({
        msg: `Admin updated IG “${i.name}”`,
        time: moment(i.updated_at),
        timeText: moment(i.updated_at).fromNow()
      });
    });

    recentGallery.forEach(g => {
      activityFeed.push({
        msg: `New gallery uploaded by ${g.uploaded_by}`,
        time: moment(g.created_at),
        timeText: moment(g.created_at).fromNow()
      });
    });

    // Sort by real timestamps
    activityFeed.sort((a, b) => b.time.valueOf() - a.time.valueOf());

    // 📅 Upcoming Events
    const [rawEvents] = await connection.promise().query(`
     SELECT * FROM events WHERE date >= CURDATE()
    `);

    const upcomingEvents = rawEvents.map(event => ({
      name: event.name,
      date: moment(event.date).format('DD MMM YYYY'),
      ig_name: event.ig_name
    }));

    // 🗨️ Recent Comments
    const [recentComments] = await connection.promise().query(`
      SELECT c.comment, c.created_at, s.name AS commenter
      FROM gallery_comments c
      JOIN students s ON c.student_id = s.id
      ORDER BY c.created_at DESC
      LIMIT 5
    `);

    // 📊 Summary Stats
    const [students] = await connection.promise().query('SELECT COUNT(*) AS count FROM students');
    const [igs] = await connection.promise().query('SELECT COUNT(*) AS count FROM interest_groups');
    const [events] = await connection.promise().query("SELECT COUNT(*) AS count FROM events WHERE date >= CURDATE()");
    const [schools] = await connection.promise().query('SELECT COUNT(*) AS count FROM schools');
    const [gallery] = await connection.promise().query('SELECT COUNT(*) AS count FROM galleries');
    const [achievements] = await connection.promise().query('SELECT COUNT(*) AS count FROM student_achievements');

    // 🔔 Pending
    const [pendingIGs] = await connection.promise().query("SELECT COUNT(*) AS count FROM interest_groups WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
    const [pendingMembers] = await connection.promise().query("SELECT COUNT(*) AS count FROM members WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
    const [pendingGallery] = await connection.promise().query("SELECT COUNT(*) AS count FROM galleries WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
    const [announcements] = await connection.promise().query('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 3');
    // ✅ Render Dashboard
    res.render('Admin/admindashboard', {
      totalStudents: students[0].count,
      totalIGs: igs[0].count,
      upcomingEvents: events[0].count,
      totalSchools: schools[0].count,
      totalGallery: gallery[0].count,
      totalAchievements: achievements[0].count,
      pendingIGs: pendingIGs[0].count,
      pendingMembers: pendingMembers[0].count,
      pendingGallery: pendingGallery[0].count,
      recentAnnouncements: announcements,
      upcomingEventsUpdate: upcomingEvents,
      activityFeed,
      recentComments,
      serverStatus,
      dbLatency,
      storageUsage,
      lastBackup,
      totalAnnouments: totalAnnouments[0].count
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


// app.get("/api/events", async (req, res) => {
//   try {
//     const [rows] = await connection.promise().query(`
//       SELECT e.event_name AS title, e.date AS start, ig.name AS ig
//       FROM events e
//       JOIN interest_groups ig ON e.ig_id = ig.id
//     `);

//     // Optional: Add IG name as tooltip or extendedProps
//     const formattedEvents = rows.map(event => ({
//       title: `${event.title} (${event.ig})`,
//       start: event.start,
//       allDay: true
//     }));

//     res.json(formattedEvents);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to load events" });
//   }
// });

app.get('/admin/achievements', (req, res) => {
  const sql = `
    SELECT sa.*, s.name AS student_name
    FROM student_achievements sa
    JOIN students s ON sa.student_id = s.id
    ORDER BY sa.date_awarded DESC
  `;

  connection.query(sql, (err, results) => {
    if (err) {
      console.error('MySQL Error:', err);
      return res.status(500).send('Database error');
    }

    res.render('Admin/manageAchievements', { achievements: results });
  });
});
app.get('/admin/achievements/add', (req, res) => {
  connection.query('SELECT id, name FROM students', (err, students) => {
    if (err) return res.status(500).send('Database error.');
    res.render('Admin/addAchievement', { students });
  });
});

app.post('/admin/achievements/add', (req, res) => {
  const { student_id, title, description, date_awarded } = req.body;

  const sql = `
    INSERT INTO student_achievements (student_id, title, description, date_awarded)
    VALUES (?, ?, ?, ?)
  `;

  connection.query(sql, [student_id, title, description, date_awarded], (err, result) => {
    if (err) {
      console.error('❌ Error inserting achievement:', err);
      return res.status(500).send('Database error.');
    }

    // ✅ Redirect to achievements dashboard after success
    res.redirect('/admin/achievements');
  });
});


app.get('/admin/achievements/edit/:id', (req, res) => {
  const achievementId = req.params.id;

  const getAchievement = `
    SELECT * FROM student_achievements WHERE id = ?
  `;
  const getStudents = `
    SELECT id, name FROM students
  `;

  connection.query(getAchievement, [achievementId], (err, achievementResults) => {
    if (err || achievementResults.length === 0) {
      req.flash('error', 'Achievement not found.');
      return res.redirect('/admin/achievements');
    }

    const achievement = achievementResults[0];

    connection.query(getStudents, (err2, students) => {
      if (err2) {
        req.flash('error', 'Failed to fetch student list.');
        return res.redirect('/admin/achievements');
      }

      res.render('Admin/editAchievement', { achievement, students });
    });
  });
});



app.post('/achievements/edit/:id', (req, res) => {
  const achievementId = req.params.id;
  const { student_id, title, description, date_awarded } = req.body;

  const updateQuery = `
    UPDATE student_achievements
    SET student_id = ?, title = ?, description = ?, date_awarded = ?
    WHERE id = ?
  `;

  connection.query(updateQuery, [student_id, title, description, date_awarded, achievementId], (err, result) => {
    if (err) {
      console.error('❌ Error updating achievement:', err);
      return res.status(500).send('Database error.');
    }

    res.redirect('/admin/achievements');
  });
});



app.get("/studentdashboard", authUser, (req, res) => {
  if (req.session.user.roles === "student") {
    return res.render("/Student/studentdashboard", {
      user: req.session.user.username,
      successMsg: req.flash('successMsg'),
      errorMsg: req.flash('errorMsg')
    });
  } else {
    req.flash('errorMsg', 'Access denied. Students only.');
    return res.redirect('/admindashboard');
  }
});

// ---------- Admin: Manage IGs ----------
app.get("/admin/igs", authAdmin, (req, res) => {
  const sql = "SELECT * FROM interest_groups";
  connection.query(sql, (err, results) => {
    if (err) {
      req.flash("errorMsg", "Failed to fetch IGs.");
      return res.render("admin-igs", { igs: [], successMsg: req.flash("successMsg"), errorMsg: req.flash("errorMsg") });
    }
    res.render("admin-igs", {
      igs: results,
      successMsg: req.flash("successMsg"),
      errorMsg: req.flash("errorMsg")
    });
  });
});

// ---------- Start Server ----------
app.listen(3000, () => {
  console.log('🚀 Server is running on http://localhost:3000');

});
