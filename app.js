const express = require('express');
const multer = require("multer");
const mysql = require("mysql2");
const session = require('express-session');
const flash = require("connect-flash");
const path = require('path');
const validator = require('validator');
const bcrypt = require('bcrypt');
const app = express();
const moment = require('moment'); 
const { type } = require('os');
const checkDiskSpace = require('check-disk-space').default;


const connection = mysql.createConnection({
  host: '4t38n5.h.filess.io',
  user: 'c237ca2group5_slavegulf',
  port:3307,
  password: 'b69eb482e0b1ce82afc48f207c3ef3b08594f27f',
  database: 'c237ca2group5_slavegulf',
  connectTimeout:10000,

});
connection.connect(err => {
  if (err) return console.error('MySQL error:', err);
  console.log('MySQL connected');
});

// Multer Setup (for image uploads)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'proof-' + unique + path.extname(file.originalname));
  }
});

const upload = multer({ storage , dest:'public/uploads/'});
app.use(express.json());
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.urlencoded({ extended: true }));
// Middleware Setup
app.use(session({
  secret: 'Secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
// Flash middleware must come after session
app.use(flash());

// MySQL Setup

// });
// // ---------- Middleware ----------
const authUser = (req, res, next) => {
  if (req.session.user) return next();
  req.flash("errorMsg", "Please log in to access this page.");
  return res.redirect('/login');
};

const authAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.roles === 'admin') return next();
  req.flash("errorMsg", "Access denied. Admins only.");
  return res.redirect('/login');

};



// ✅ View All Announcements (Manage Page)

app.get('/admin/announcements',authUser , authAdmin, (req, res) => {
  // Set filter to show only 'admin' target audience announcements
  const filterTargetAudience = 'Admins';

  // Build the query to fetch only admin announcements
  let query = 'SELECT * FROM announcements WHERE target_audience = ?';
  const params = [filterTargetAudience];  // Filter for only 'admin' audience

  // Execute the query
  connection.query(query, params, (err, results) => {
    if (err) {
      req.flash('error', 'Error fetching announcements');
      return res.redirect('/admin');
    }

    // Render the announcements page with the filtered results
    res.render('Admin/Announcement(Weijie)/manageAnnouncements', {
      announcements: results, // Send fetched announcements to the view
      successMsg: req.flash('success'),
      errorMsg: req.flash('error'),
    });
  });
});





// Show Add Announcement Form
app.get('/admin/announcements/add', authUser , authAdmin, (req, res) => {
  res.render('Admin/Announcement(Weijie)/addAnnouncement');
});

// Handle Add Announcement
app.post('/admin/announcements/add', (req, res) => {
  const { title, message, target_audience } = req.body;

 

    query='INSERT INTO announcements (title, message, target_audience, created_at) VALUES (?, ?, ?, NOW())'

  const values = [title, message, target_audience]

  connection.query(query, values, (err) => {
    if (err) {
      console.error('❌ SQL INSERT ERROR:', err);  // LOG this
      req.flash('error', 'Failed to add announcement.');
      return res.redirect('/admin/announcements/add');
    }
    req.flash('success', 'Announcement added successfully!');
    res.redirect('/admin/announcements');
  });
});



// Show Edit Form
app.get('/admin/announcements/edit/:id',authUser , authAdmin ,(req, res) => {
  const id = req.params.id;

  connection.query('SELECT * FROM announcements WHERE id = ?', [id], (err, results) => {
    if (err || results.length === 0) {
      req.flash('error', 'Announcement not found.');
      return res.redirect('/admin/announcements');
    }
    res.render('Admin/Announcement(Weijie)/editAnnouncement', { announcement: results[0] });
  });
});

// Handle Edit Announcement
app.post('/admin/announcements/edit/:id',authUser , authAdmin, (req, res) => {
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


// 🗑️ Handle Delete
app.post('/admin/announcements/delete/:id',authUser , authAdmin, (req, res) => {
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



// //Route student dashboard
// // app.get('Student/studentDashboard', authUser, (req, res) => {
// //   if (req.session.user.roles === 'student') {
// //     return res.render('Student/studentDashboard', {
// //       user: req.session.user.username,
// //       successMsg: req.flash('successMsg'),
// //       errorMsg: req.flash('errorMsg')
// //     });
// //   } else {
// //     req.flash('errorMsg', 'Access denied. Students only.');
// //     return res.redirect('/admindashboard');
// //   }
// // });



// GET route to render the "Manage Events" page
app.get('/admin/events',authUser , authAdmin, (req, res) => {
  const query = `
    SELECT ev.id, ev.name, ev.date, ev.location, ev.description, ig.name AS ig_name
    FROM events AS ev
    LEFT JOIN ig_categories AS ig ON ev.ig_id = ig.id
  `;

  connection.query(query, (err, eventList) => {
    console.log(eventList)
    if (err) {
      req.flash('error', 'Error loading events');
      return res.render('Admin/Events(Weijie)/ManageEvents', {
        eventList: [],
        successMsg: req.flash('success'),
        errorMsg: req.flash('error')
      });
    }

    res.render('Admin/Events(Weijie)/ManageEvents', {
      eventList: eventList,
      moment,
      successMsg: req.flash('success'),
      errorMsg: req.flash('error')
    });
  });
});

// GET route to fetch all gallery items
app.get('/admin/gallery',authUser , authAdmin,(req, res) => {


  const query = `SELECT g.id, g.title, g.media_url, g.caption, g.upload_date, g.created_at, 
                        ig.name AS ig_name 
                 FROM galleries AS g 
                 LEFT JOIN interest_groups AS ig ON g.ig_id = ig.id`;

  connection.query(query, (err, galleryList) => {
    if (err) {
      req.flash('error', 'Error loading gallery items');
      return res.render('Admin/Gallary(Kal)/ManageGallery', {
        galleryList: [],
        successMsg: req.flash('success'),
        errorMsg: req.flash('error'),
        user: req.session.user  // Pass user info for role checking
      });
    }

    res.render('Admin/Gallary(Kal)/ManageGallery', {
      galleryList: galleryList,
      successMsg: req.flash('success'),
      errorMsg: req.flash('error'),
      user: req.session.user  // Pass user info for role checking
    });
  });
});

// POST route to add a new gallery item



// POST route to handle gallery item addition
app.post('/admin/gallery/add',authUser , authAdmin, upload.single('media_url'), (req, res) => {
  // Destructure form fields and file data
  const { caption, upload_date, student_id, title, ig_id } = req.body;
  const media_url = req.file ? '/uploads/' + req.file.filename : null; // Get the uploaded file's URL

  console.log(req.file);  // Logs file information (media_url)
  console.log(req.body);  // Logs other form fields (title, caption, etc.)

  // Insert query to add gallery item into the database
  const query = 'INSERT INTO galleries (media_url, caption, upload_date, student_id, title, ig_id) VALUES (?, ?, ?, ?, ?, ?)';

  connection.query(query, [media_url, caption, upload_date, student_id, title, ig_id], (err) => {
    if (err) {
      console.error('Error adding new gallery item:', err);
      req.flash('error', 'Error adding new gallery item');
      return res.redirect('/admin/gallery');
    }

    req.flash('success', 'Gallery item added successfully');
    res.redirect('/admin/gallery');
  });
});



// GET route to render the "Add Gallery" page
app.get('/admin/gallery/add',authUser , authAdmin, (req, res) => {
  // Fetch Interest Groups (IGs) to populate the dropdown in the form
  const query = 'SELECT id, name FROM interest_groups';

  connection.query(query, (err, igList) => {
    if (err) {
      req.flash('error', 'Error loading interest groups');
      return res.redirect('/admin/gallery');
    }

    // Render the Add Gallery page, passing the list of IGs
    res.render('Admin/Gallary(Kal)/AddGallery', {
      igList: igList,
      message: req.flash('message'),

      successMsg: req.flash('success'),
      errorMsg: req.flash('error')
    });
  });
});




app.get('/admin/gallery', authUser , authAdmin,(req, res) => {
  const query = `SELECT g.id, g.title, g.media_url, g.caption, g.upload_date, g.created_at, 
                        ig.name AS ig_name 
                 FROM galleries AS g 
                 LEFT JOIN interest_groups AS ig ON g.ig_id = ig.id`;

  connection.query(query, (err, galleryList) => {
    if (err) {
      req.flash('error', 'Error loading gallery items');
      return res.render('Admin/Gallery(Kal)/ManageGallery', {
        galleryList: [],
        successMsg: req.flash('success'),
        errorMsg: req.flash('error')
      });
    }
    
   res.render('Admin/Gallery(Kal)/ManageGallery', {
  galleryList: galleryList,
  successMsg: req.flash('success'),
  errorMsg: req.flash('error')
});

  });
});

app.get('/admin/gallery/edit/:id',authUser , authAdmin, (req, res) => {
  const { id } = req.params;
  
  const query = 'SELECT * FROM galleries WHERE id = ?';
  
  connection.query(query, [id], (err, result) => {
    if (err || result.length === 0) {
      req.flash('error', 'Gallery item not found');
      return res.redirect('/admin/gallery');
    }

    res.render('Admin/Gallary(Kal)/EditGallary', {
      gallery: result[0],
      successMsg: req.flash('success'),
      errorMsg: req.flash('error')
    });
  });
});

// POST route to update the gallery item

app.post('/admin/gallery/edit/:id',authUser , authAdmin, upload.single('media_image'), (req, res) => {
  const galleryId = req.params.id;
  const { title, caption, ig_id, student_id, upload_date } = req.body;

  // Fetch the existing gallery details from the database to retain old media_url if no new image is uploaded
  const querySelect = 'SELECT * FROM galleries WHERE id = ?';
  
  connection.query(querySelect, [galleryId], (err, results) => {
    if (err || results.length === 0) {
      console.error('Error fetching gallery:', err);
      req.flash('error', 'Gallery not found');
      return res.redirect('/admin/gallery');
    }

    const existingGallery = results[0]; // Existing gallery data

    // Get the new media URL if a new image is uploaded, otherwise use the existing media_url
    const newMediaUrl = req.file ? `/uploads/${req.file.filename}` : existingGallery.media_url;

    // Update the gallery in the database with the new values
    const queryUpdate = `
      UPDATE galleries 
      SET title = ?, caption = ?, media_url = ?, ig_id = ?, student_id = ?, upload_date = ? 
      WHERE id = ?
    `;

    connection.query(queryUpdate, [title, caption, newMediaUrl, ig_id, student_id, upload_date, galleryId], (err, result) => {
      if (err) {
        console.error('Error updating gallery:', err);
        req.flash('error', 'Failed to update gallery');
        return res.redirect(`/admin/gallery/edit/${galleryId}`);
      }

      req.flash('success', 'Gallery updated successfully');
      res.redirect('/admin/gallery');
    });
  });
});

app.post('/admin/gallery/delete/:id',authUser , authAdmin, (req, res) => {
  const { id } = req.params;
  
  // Check if ID is valid
  if (!id) {
    req.flash('error', 'No ID provided');
    return res.redirect('/admin/gallery');
  }

  console.log(`Deleting gallery with ID: ${id}`);

  // First, delete the comments related to this gallery
  const deleteCommentsQuery = 'DELETE FROM gallery_comments WHERE gallery_id = ?';
  
  connection.query(deleteCommentsQuery, [id], (err) => {
    if (err) {
      console.error('Error deleting comments:', err);
      req.flash('error', 'Error deleting gallery comments');
      return res.redirect('/admin/gallery');
    }

    // Then, delete the gallery
    const deleteGalleryQuery = 'DELETE FROM galleries WHERE id = ?';
    
    connection.query(deleteGalleryQuery, [id], (err) => {
      if (err) {
        console.error('Error deleting gallery:', err);
        req.flash('error', 'Error deleting gallery item');
        return res.redirect('/admin/gallery');
      }

      req.flash('success', 'Gallery item deleted successfully');
      res.redirect('/admin/gallery');
    });
  });
});





// // ---------- Logout ----------
app.get("/logout", (req, res) => {
  if (req.session) {
    req.flash("successMsg", "You have been logged out successfully."); 

    req.session.destroy(err => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.redirect('/home');
      }
      res.redirect('/login'); 
    });
  } else {
    return res.redirect('/login');
  }
});





// Route to fetch comments for a specific gallery item
app.get('/admin/gallery/comments/:id',authUser , authAdmin,(req, res) => {
  const galleryId = req.params.id;

  const query = `
    SELECT c.comment, c.created_at, s.name AS student_name
    FROM gallery_comments c
    JOIN students s ON c.student_id = s.id
    WHERE c.gallery_id = ?
    ORDER BY c.created_at DESC
  `;

  connection.query(query, [galleryId], (err, results) => {
    if (err) {
      console.error('Error fetching comments:', err);
      return res.status(500).json({ error: 'Failed to load comments' });
    }

    res.json(results); // Send the comments as a JSON response
  });
});

app.post('/admin/gallery/:id/comment',authUser , authAdmin, (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;

  // Check if the user is authenticated and is an admin
  if (!req.session.user || req.session.user.roles !== 'admin') {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  // Ensure comment isn't empty
  if (!comment) {
    return res.status(400).json({ error: "Comment cannot be empty." });
  }

  const user_id = req.session.user.id;  // Get user ID from session

  const query = `
    INSERT INTO gallery_comments (gallery_id, comment, user_id)
    VALUES (?, ?, ?)
  `;

  connection.query(query, [id, comment, user_id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error adding comment." });
    }

    // Respond with success
    res.json({ success: true });
  });
});



// // ---------- Home ----------
app.get('/', (req, res) => res.redirect('/login'));

// // ---------- Login ----------
app.get('/login', (req, res) => {
  res.render('login', {
    successMsg: req.flash('successMsg'),
    errorMsg: req.flash('errorMsg')
  });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    req.flash('errorMsg', 'Please fill in all fields.');
    return res.redirect('/login');
  }

  if (!validator.isEmail(email)) {
    req.flash('errorMsg', 'Invalid email format.');
    return res.redirect('/login');
  }

  // Select the user based on the email
  const sql = "SELECT * FROM users WHERE email = ?";
  connection.query(sql, [email], (err, results) => {
    if (err) {
      req.flash('errorMsg', 'Database error');
      return res.redirect('/login');
    }

    // Check if the user exists
    if (results.length > 0) {
      const user = results[0];

      // Compare the entered password with the stored password hash
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          req.flash('errorMsg', 'Error while comparing passwords');
          return res.redirect('/login');
        }

        if (isMatch) {
          req.session.user = user;
          req.flash('successMsg', 'Login successful!');
          return res.redirect(user.roles === 'admin' ? '/admin' : '/students/dashboard');
        } else {
          req.flash('errorMsg', 'Invalid email or password');
          return res.redirect('/login');
        }
      });
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

  // Validate input
  if (!username || !email || !password ||!roles) {
    req.flash('errorMsg', 'Please fill in all fields.');
    return res.redirect('/register');
  }

  if (!validator.isEmail(email)) {
    req.flash('errorMsg', 'Invalid email format.');
    return res.redirect('/register');
  }

  // Hash the password before saving it to the database
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      req.flash('errorMsg', 'Error hashing password.');
      return res.redirect('/register');
    }

    // Save the new user to the database with the hashed password
    const sql = "INSERT INTO users (username ,email,password,roles) VALUES (?, ?, ?, ?)";
    connection.query(sql, [username,email , hashedPassword, roles], (err, results) => {
      if (err) {
        req.flash('errorMsg', 'Database error during registration.');
        return res.redirect('/register');
      }

      req.flash('successMsg', 'Registration successful! Please login.');
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


app.post('/reset-password', async (req, res) => {
  const { email, newPassword, confirmPassword } = req.body;

  // Validate input
  if (!email || !newPassword || !confirmPassword) {
    req.flash('errorMsg', 'Please fill in all fields.');
    return res.redirect('/reset-password');
  }

  if (newPassword !== confirmPassword) {
    req.flash('errorMsg', 'Passwords do not match.');
    return res.redirect('/reset-password');
  }

  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in the database
    const sql = "UPDATE users SET password = ? WHERE email = ?";
    connection.query(sql, [hashedPassword, email], (err, result) => {
      if (err) {
        req.flash('errorMsg', 'Error updating password.');
        return res.redirect('/reset-password');
      }

      if (result.affectedRows === 0) {
        req.flash('errorMsg', 'Email not found.');
        return res.redirect('/reset-password');
      }

      req.flash('successMsg', 'Password updated successfully!');
      return res.redirect('/login'); // Redirect to login after reset
    });
  } catch (err) {
    req.flash('errorMsg', 'Error during password reset.');
    return res.redirect('/reset-password');
  }
});





app.get('/admin/events/add',authUser , authAdmin, (req, res) => {
  // Query to fetch all categories (interest groups)
  const query = `SELECT * FROM ig_categories`;
  
  connection.query(query, (err, categories) => {
    if (err) {
      req.flash('error', 'Failed to load categories.');
      return res.redirect('/admin/events');
    }

    // Render Add Event page with categories
    res.render('Admin/Events(Weijie)/AddEvents', { 
      ig_id: categories,
      successMsg: req.flash('success'),
      errorMsg: req.flash('error')
    });
  });
});





// POST route to add an event
// // POST route to add a new event




app.post('/admin/events/add',authUser , authAdmin, (req, res) => {
  const { event_name, event_date, location, ig_id, event_description } = req.body;

  
  // Validate if category_id exists in interest_groups
  const checkCategoryQuery = 'SELECT id FROM interest_groups WHERE id = ?';
  
  connection.query(checkCategoryQuery, [ig_id], (err, result) => {
    if (err) {
      req.flash('error', 'Error validating category ID');
      return res.redirect('/admin/events/add');
    }

    if (result.length === 0) {
      req.flash('error', 'Invalid Interest Group selected');
      return res.redirect('/admin/events/add');
    }

    // Proceed to insert the event if category_id is valid
    const query = `
      INSERT INTO events ( ig_id,name, date, location,description)
      VALUES (?, ?, ?, ?, ?)
    `;

    connection.query(query, [ig_id,event_name, event_date, location, event_description], (err, results) => {
      if (err) {
        req.flash('error', 'Failed to add event. Please try again.');
        return res.redirect('/admin/events/add');
      }
      req.flash('success', 'Event added successfully!');
      return res.redirect('/admin/events');
    });
  });
});




// GET: Edit event form
// GET route to render the "Edit Event" page
app.get('/admin/events/edit/:id',authUser , authAdmin,(req, res) => {
  const eventId = req.params.id;

  // Query to fetch the event details by ID
  const eventQuery = `
    SELECT ev.id, ev.name, ev.date, ev.location, ev.description, ev.ig_id
    FROM events AS ev
    WHERE ev.id = ?
  `;
  
  // Query to fetch the list of interest groups
  const igQuery = `SELECT id, name FROM interest_groups`;

  // Execute both queries concurrently
  connection.query(eventQuery, [eventId], (err, eventResult) => {
    if (err) {
      req.flash('error', 'Error fetching event details');
      return res.redirect('/admin/events');
    }

    connection.query(igQuery, (err, igResult) => {
      if (err) {
        req.flash('error', 'Error fetching interest groups');
        return res.redirect('/admin/events');
      }

      // Render the Edit Event page, passing both the event and igList
      res.render('Admin/Events(Weijie)/EditEvents', {
        event: eventResult[0],  // Assuming only one event is returned
        igList: igResult,       // List of interest groups
        successMsg: req.flash('success'),
        errorMsg: req.flash('error')
      });
    });
  });
});

app.post('/admin/events/edit/:id',authUser , authAdmin, (req, res) => {
  const { id } = req.params;
  const { name, date, location, ig_id, description } = req.body;

  // Update query to modify event details
  const updateQuery = `
    UPDATE events
    SET name = ?, date = ?, location = ?, ig_id = ?, description = ?
    WHERE id = ?
  `;

  connection.query(updateQuery, [name, date, location, ig_id, description, id], (err) => {
    if (err) {
      req.flash('error', 'Error updating event');
      return res.redirect(`/admin/events/edit/${id}`);
    }

    req.flash('success', 'Event updated successfully');
    res.redirect('/admin/events');
  });
});


// POST route to delete an Event
app.post('/admin/events/delete/:id',authUser , authAdmin, (req, res) => {
  const { id } = req.params;

  // Deleting the event by its ID
  const deleteQuery = 'DELETE FROM events WHERE id = ?';

  connection.query(deleteQuery, [id], (err) => {
    if (err) {
      req.flash('error', 'Failed to delete event');
    } else {
      req.flash('success', 'Event deleted successfully');
    }

    res.redirect('/admin/events');
  });
});



// // GET Admin Profile Page
app.get('/admin/profile', authUser , authAdmin, (req, res) => {
  const adminId = req.session?.user?.id;

  if (!adminId) {
    req.flash('error', 'Session expired. Please log in again.');
    return res.redirect('/login');
  }

  connection.query(
    'SELECT * FROM users WHERE id = ? AND roles = "admin"',
    [adminId],
    (err, results) => {
      if (err || results.length === 0) {
        req.flash('error', 'Admin not found');
        return res.redirect('/admin');
      }

      const admin = results[0];
      const loginInfo = admin.last_login
        ? `${new Date(admin.last_login).toLocaleString('en-SG')} – ${admin.last_browser} (${admin.login_success ? '✅' : '❌'})`
        : 'No login info yet';

      res.render('Admin/Profile(DeEn)/profileSettings', {
        
        admin,
        loginInfo,
        success: req.flash('success'),
        error: req.flash('error')
      });
    }
  );
});

// POST Update Admin Profile
app.post('/admin/profile/update',authUser , authAdmin,  upload.single('profileImage'), async (req, res) => {
  const userId = req.session?.user?.id;
  const { fullname, email, username } = req.body;
  const profileImage = req.file ? req.file.filename : null;

  if (!userId) {
    req.flash('error', 'Session expired. Please log in again.');
    return res.redirect('/login');
  }

  try {
    if(!fullname || !email || !username) {
      req.flash("error", "please make sure all the fields are entered.") 
      return redirect("/admin/profile")
    }
    const updateQuery = profileImage
      ? 'UPDATE users SET fullname = ?, email = ?, username = ?, profile_image = ? WHERE id = ? AND roles = "admin"'
      : 'UPDATE users SET fullname = ?, email = ?, username = ? WHERE id = ? AND roles = "admin"';

    const params = profileImage
      ? [fullname, email, username, profileImage, userId]
      : [fullname, email, username, userId];

    await connection.execute(updateQuery, params);
    req.flash('success', 'Profile updated successfully');
  } catch (err) {
    req.flash('error', 'Failed to update profile');
  }

  res.redirect('/admin/profile');
});

// POST Change Admin Password

//  POST Change Admin Password

app.post('/admin/profile/password',authUser , authAdmin ,async (req, res) => {
  const userId = req.session?.user?.id;
  const { newPassword, confirmPassword } = req.body;

  if (!userId) {
    req.flash('error', 'Session expired. Please log in again.');
    return res.redirect('/admin/profile'); // Redirect to the same page if session expired
  }

  if (!newPassword || !confirmPassword) {
    req.flash('error', 'Please fill out both password fields.');
    return res.redirect('/admin/profile'); // Redirect to the same page
  }

  if (newPassword !== confirmPassword) {
    req.flash('error', 'Passwords do not match.');
    return res.redirect('/admin/profile'); // Redirect to the same page
  }

  try {
    const hashed = await bcrypt.hash(newPassword, 10);

    // Execute query
    const result = await connection.execute(
      'UPDATE users SET password = ? WHERE id = ? AND roles = "admin"',
      [hashed, userId]
    );

    // Check if result contains expected structure
    if (result && result[0] && result[0].affectedRows === 0) {
      req.flash('error', 'No admin found to update password.');
    } else {
      req.flash('success', 'Password updated successfully.');
    }
  } catch (err) {
    req.flash('error', 'Failed to update password.');
  }

  // Redirect after the operation
  res.redirect('/admin/profile');
});


// ✅ POST Delete Admin Account
// DELETE ADMIN ACCOUNT
app.post('/admin/profile/delete',authUser , authAdmin,async (req, res) => {
  if (!req.session.user || req.session.user.roles !== 'admin') {
    req.flash('error', 'Unauthorized access.');
    return res.redirect('/login');
  }

  try {
    await connection.execute(
      'DELETE FROM users WHERE id = ? AND roles = "admin"',
      [req.session.user.id]
    );

    // Flash message before destroying the session
    req.flash('success', 'Your account has been deleted.');

    // Destroy session and redirect
    req.session.destroy(err => {
      if (err) {
        return res.redirect('/admin/profile');
      }
      res.clearCookie('connect.sid');
      return res.redirect('/login');
    });

  } catch (err) {
    req.flash('error', 'Failed to delete account.');
    res.redirect('/admin/profile');
  }
});





app.get('/admin/manage-igs',authUser , authAdmin, (req, res) => {
  // Correct the SQL query with proper JOINs and GROUP BY
  const query = `
    SELECT 
      ig.id, 
      ig.name, 
      ig.description, 
      ig.advisor, 
      ig_categories.name AS category_name, 
      COUNT(members.id) AS member_count
    FROM interest_groups AS ig
    LEFT JOIN ig_categories ON ig.category_id = ig_categories.id
    LEFT JOIN members ON members.ig_id = ig.id
    GROUP BY ig.id, ig.name, ig.description, ig.advisor, ig_categories.name;
  `;
  
  connection.query(query, (err, results) => {
    if (err) {
      req.flash('error', 'Error loading interest groups');
      return res.render('Admin/IG(Siti)/ManageIG', { 
        igList: [], 
        message: req.flash("success", ""), 
        successMsg: req.flash("success", ""),
        errorMsg: req.flash("error", "") 
      });
    }
    // Pass the results to the template for rendering
    res.render('Admin/IG(Siti)/ManageIG', { 
      igList: results, 
      message: req.flash("success", ""), 
      successMsg: req.flash("success", ""),
      errorMsg: req.flash("error", "") 
    });
  });
});





// GET route to render the 'Add New Interest Group' form
app.get('/admin/manage-igs/add',authUser , authAdmin, (req, res) => {
  // Query to fetch all categories for the category dropdown
  connection.query('SELECT * FROM ig_categories', (err, categories) => {
    if (err) {
      req.flash('error', 'Error loading categories');
      return res.render('Admin/IG(Siti)/AddIG', { 
        categories: [], 
        successMsg: req.flash("success"),
        errorMsg: req.flash('error') 
      });
    }

    // Render the 'Add New Interest Group' form with categories
    res.render('Admin/IG(Siti)/AddIG', {
      categories: categories,
      errorMsg: req.flash('error'),
              successMsg: req.flash("success"),

    });
  });
});


app.post('/admin/manage-igs/add',authUser , authAdmin, (req, res) => {
  const { name, category_id, description, advisor } = req.body;

  // Insert the new interest group into the database
  const query = 'INSERT INTO interest_groups (name, category_id, description, advisor) VALUES (?, ?, ?, ?)';
  
  connection.query(query, [name, category_id, description, advisor], (err) => {
    if (err) {
      req.flash('error', 'Failed to add Interest Group');
      return res.redirect('/admin/manage-igs'); // Redirect back to the Manage IGs page
    }

    req.flash('success', 'Interest Group added successfully!');
    res.redirect('/admin/manage-igs'); // After successful insert, redirect to refresh the page and show the new IG
  });
});


// POST route to delete an Interest Group
app.post('/admin/manage-igs/delete/:id',authUser , authAdmin, (req, res) => {
  const { id } = req.params;
  
  connection.query('DELETE FROM interest_groups WHERE id = ?', [id], (err) => {
    if (err) {
      req.flash('error', 'Failed to delete interest group');
    } else {
      req.flash('success', 'Interest group deleted');
    }
    res.redirect('/admin/manage-igs');
  });
});



// GET route to render the Edit IG page
app.get('/admin/manage-igs/edit/:id',authUser , authAdmin,(req, res) => {
  const igId = req.params.id;
  
  // Query to fetch the IG details by ID
  const igQuery = `
    SELECT ig.id, ig.name, ig.description, ig.advisor, 
           ig.category_id, ig_categories.name AS category_name
    FROM interest_groups AS ig
    LEFT JOIN ig_categories ON ig.category_id = ig_categories.id
    WHERE ig.id = ?`;

  // Query to fetch all categories for the dropdown
  const categoriesQuery = `SELECT id, name FROM ig_categories`;

  // Execute both queries
  connection.query(igQuery, [igId], (err, igResults) => {
    if (err) {
      req.flash('error', 'Error loading interest group');
      return res.redirect('/admin/manage-igs');
    }

    if (igResults.length === 0) {
      req.flash('error', 'Interest group not found');
      return res.redirect('/admin/manage-igs');
    }

    // Execute the categories query
    connection.query(categoriesQuery, (err, categories) => {
      if (err) {
        req.flash('error', 'Error loading categories');
        return res.redirect('/admin/manage-igs');
      }

      // Pass the IG and categories data to the view
      const ig = igResults[0];
      res.render('Admin/IG(Siti)/EditIG', {
        ig: ig,   // IG details
        categories: categories,   // All categories for the dropdown
        successMsg: req.flash('success'),
        errorMsg: req.flash('error')
      });
    });
  });
});


app.post('/admin/manage-igs/edit/:id',authUser , authAdmin, (req, res) => {
  const igId = req.params.id;
  const { name, description, advisor, category_id } = req.body; // Extract form values

  // Query to update the Interest Group
  const query = `
    UPDATE interest_groups
    SET name = ?, description = ?, advisor = ?, category_id = ?
    WHERE id = ?
  `;
  
  connection.query(query, [name, description, advisor, category_id, igId], (err) => {
    if (err) {
      req.flash('error', 'Failed to update Interest Group');
      return res.redirect(`/admin/manage-igs/edit/${igId}`); // Redirect back to the edit page if error occurs
    }

    req.flash('success', 'Interest Group updated successfully');
    res.redirect('/admin/manage-igs'); // Redirect to the manage page after success
  });
});



// GET route for managing categories
app.get('/admin/manage-categories',authUser , authAdmin,(req, res) => {
  // Query to fetch existing categories
  connection.query('SELECT * FROM ig_categories', (err, categories) => {
    if (err) {
      req.flash('error', 'Error loading categories');
      return res.render('Admin/IG(Siti)/ManageCategories', { 
        categories: [], 
        successMsg: req.flash('success'), 
        errorMsg: req.flash('error') 
      });
    }

    res.render('Admin/IG(Siti)/ManageCategories', {
      categories: categories,
      successMsg: req.flash('success'),
      errorMsg: req.flash('error')
    });
  });
});
// POST route to add a new category
app.post('/admin/manage-categories/add',authUser , authAdmin, (req, res) => {
  const { category_name } = req.body;

  // Check if the category already exists
  connection.query('SELECT * FROM ig_categories WHERE name = ?', [category_name], (err, results) => {
    if (err) {
      req.flash('error', 'Error checking category');
      return res.redirect('/admin/manage-categories');
    }

    if (results.length > 0) {
      // Category already exists
      req.flash('error', 'Category already exists');
      return res.redirect('/admin/manage-categories');
    }

    // Insert new category into the database
    connection.query('INSERT INTO ig_categories (name) VALUES (?)', [category_name], (err) => {
      if (err) {
        req.flash('error', 'Failed to add category');
        return res.redirect('/admin/manage-categories');
      }
      req.flash('success', 'Category added successfully');
      res.redirect('/admin/manage-categories');
    });
  });
});
// POST route to update a category
app.post('/admin/manage-categories/edit/:id',authUser , authAdmin, (req, res) => {
  const categoryId = req.params.id;
  const { category_name } = req.body;

  // Query to update the category name
  connection.query('UPDATE ig_categories SET name = ? WHERE id = ?', [category_name, categoryId], (err) => {
    if (err) {
      req.flash('error', 'Failed to update category');
      return res.redirect(`/admin/manage-categories/edit/${categoryId}`);
    }
    req.flash('success', 'Category updated successfully');
    res.redirect('/admin/manage-categories');
  });
});

// GET route to render the category edit form
app.get('/admin/manage-categories/edit/:id',authUser , authAdmin, (req, res) => {
  const categoryId = req.params.id;

  // Query to fetch the category details by its ID
  connection.query('SELECT * FROM ig_categories WHERE id = ?', [categoryId], (err, results) => {
    if (err) {
      req.flash('error', 'Failed to fetch category details');
      return res.redirect('/admin/manage-categories');
    }

    // Check if category exists
    if (results.length === 0) {
      req.flash('error', 'Category not found');
      return res.redirect('/admin/manage-categories');
    }

    // Render the edit form with the category details
    res.render('Admin/IG(Siti)/EditCategory', { 
      category: results[0], 
      successMsg: req.flash('success'), 
      errorMsg: req.flash('error')
    });
  });
});

app.post('/admin/manage-categories/delete/:id',authUser , authAdmin, (req, res) => {
  const id = parseInt(req.params.id);

  // First check if any interest group uses this category
  connection.query('SELECT COUNT(*) AS count FROM interest_groups WHERE category_id = ?', [id], (err, result) => {
    if (err) {
      req.flash('error', 'Error checking category usage');
      return res.redirect('/admin/manage-categories');
    }

    if (result[0].count > 0) {
      req.flash('error', 'Cannot delete category — it is in use by one or more interest groups.');
      return res.redirect('/admin/manage-categories');
    }

    // Safe to delete
    connection.query('DELETE FROM ig_categories WHERE id = ?', [id], err => {
      if (err) {
        req.flash('error', 'Failed to delete category');
      } else {
        req.flash('success', 'Category deleted successfully');
      }
      res.redirect('/admin/manage-categories');
    });
  });
});


// //WEIJIE #WEIJIE 
// // Admin Dashboard Route
app.get("/admin",authUser , authAdmin,  async (req, res) => {
  try {
    // System Health
    const serverStatus = 'Online';
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
// 📨 IG Join Requests (latest 5)
// 📨 IG Join Requests (latest 5)
const [joinRequests] = await connection.promise().query(`
  SELECT r.id, s.name AS student_name, ig.name AS ig_name, r.status, r.request_date
  FROM ig_join_requests r
  JOIN students s ON r.student_id = s.id
  JOIN interest_groups ig ON r.ig_id = ig.id
  ORDER BY r.request_date DESC
  LIMIT 5
`);

const recentJoinRequests = joinRequests.map(r => ({
  student: r.student_name,
  ig: r.ig_name,
  status: r.status,
    formatted_date: r.request_date ? moment(r.request_date).format("MMMM D, YYYY h:mm A") : "No Date"
}));


    //  Recent Comments
    const [recentComments] = await connection.promise().query(`
      SELECT c.comment, c.created_at, s.name AS commenter
      FROM gallery_comments c
      JOIN students s ON c.student_id = s.id
      ORDER BY c.created_at DESC
      LIMIT 5
    `);

    // Summary Stats
    const [students] = await connection.promise().query('SELECT COUNT(*) AS count FROM students');
    const [igs] = await connection.promise().query('SELECT COUNT(*) AS count FROM interest_groups');
    const [events] = await connection.promise().query("SELECT COUNT(*) AS count FROM events WHERE date >= CURDATE()");
    const [schools] = await connection.promise().query('SELECT COUNT(*) AS count FROM schools');
    const [gallery] = await connection.promise().query('SELECT COUNT(*) AS count FROM galleries');
    const [achievements] = await connection.promise().query('SELECT COUNT(*) AS count FROM student_achievements');

    // Pending
    const [pendingIGs] = await connection.promise().query("SELECT COUNT(*) AS count FROM interest_groups WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
    const [pendingMembers] = await connection.promise().query("SELECT COUNT(*) AS count FROM members WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
    const [pendingGallery] = await connection.promise().query("SELECT COUNT(*) AS count FROM galleries WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
    const [announcements] = await connection.promise().query('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 3');
    // Render Dashboard
    res.render('Admin/Dashboard(Weijie)/admindashboard', {
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
      totalAnnouments: totalAnnouments[0].count,
        recentJoinRequests, 

      moment
    });

  } catch (err) {
    res.status(500).send('Server Error');
  }
});


app.get('/admin/achievements',authUser , authAdmin, (req, res) => {
  const sql = `
    SELECT sa.*, s.name AS student_name
    FROM student_achievements sa
    JOIN students s ON sa.student_id = s.id
    ORDER BY sa.date_awarded DESC
  `;

  connection.query(sql, (err, results) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    res.render('Admin/Achievements(Kal)/manageAchievements', { achievements: results });
  });
});

// Fetch student data for the select dropdown
app.get('/admin/achievements/add',authUser , authAdmin,(req, res) => {
  connection.query('SELECT id, name FROM students', (err, students) => {
    if (err) return res.status(500).send('Database error.');
    res.render('Admin/Achievements(Kal)/addAchievement', { students });
  });
});

// POST route for adding achievements
app.post('/admin/achievements/add',authUser , authAdmin, (req, res) => {
  const { student_id, title, description, date_awarded } = req.body;

  // SQL query to insert the achievement into the database
  const sql = `
    INSERT INTO student_achievements (student_id, title, description, date_awarded)
    VALUES (?, ?, ?, ?)
  `;

  // Execute the query with the provided data
  connection.query(sql, [student_id, title, description, date_awarded], (err, result) => {
    if (err) {
      console.error('Error inserting achievement:', err);
      return res.status(500).send('Database error.');
    }

    // Redirect to achievements dashboard after success
    res.redirect('/admin/achievements');
  });
});


// GET route to render the edit achievement page with existing achievement and students data
app.get('/admin/achievements/edit/:id',authUser , authAdmin, (req, res) => {
  const achievementId = req.params.id;

  // Query to get the achievement details based on the provided id
  const getAchievement = `
    SELECT * FROM student_achievements WHERE id = ?
  `;
  const getStudents = `
    SELECT id, name FROM students
  `;

  // Fetch the achievement details from the database
  connection.query(getAchievement, [achievementId], (err, achievementResults) => {
    if (err || achievementResults.length === 0) {
      req.flash('error', 'Achievement not found.');
      return res.redirect('/admin/achievements');
    }

    const achievement = achievementResults[0];

    // Fetch the students list
    connection.query(getStudents, (err2, students) => {
      if (err2) {
        req.flash('error', 'Failed to fetch student list.');
        return res.redirect('/admin/achievements');
      }

      // Render the edit page with achievement and students data
      res.render('Admin/Achievements(Kal)/editAchievement', { achievement, students });
    });
  });
});

// POST route to update the achievement details in the database
app.post('/admin/achievements/edit/:id',authUser , authAdmin, (req, res) => {
  const achievementId = req.params.id;
  const { student_id, title, description, date_awarded } = req.body;

  // Query to update the achievement details in the database
  const updateQuery = `
    UPDATE student_achievements
    SET student_id = ?, title = ?, description = ?, date_awarded = ?
    WHERE id = ?
  `;

  connection.query(updateQuery, [student_id, title, description, date_awarded, achievementId], (err, result) => {
    if (err) {
      console.error('Error updating achievement:', err);
      req.flash('error', 'Error updating achievement.');
      return res.redirect(`/admin/achievements/edit/${achievementId}`);
    }

    // Redirect back to the achievements list page after successful update
    req.flash('success', 'Achievement updated successfully.');
    res.redirect('/admin/achievements');
  });
});


// GET route to render the edit achievement page with existing achievement and students data
app.get('/admin/achievements/edit/:id',authUser , authAdmin, (req, res) => {
  const achievementId = req.params.id;

  // Query to get the achievement details based on the provided id
  const getAchievement = `
    SELECT * FROM student_achievements WHERE id = ?
  `;
  const getStudents = `
    SELECT id, name FROM students
  `;

  // Fetch the achievement details from the database
  connection.query(getAchievement, [achievementId], (err, achievementResults) => {
    if (err || achievementResults.length === 0) {
      req.flash('error', 'Achievement not found.');
      return res.redirect('/admin/achievements');
    }

    const achievement = achievementResults[0];

    // Fetch the students list
    connection.query(getStudents, (err2, students) => {
      if (err2) {
        req.flash('error', 'Failed to fetch student list.');
        return res.redirect('/admin/achievements');
      }

      // Render the edit page with achievement and students data
      res.render('Admin/Achievements(Kal)/editAchievement', { achievement, students });
    });
  });
});

// Route to delete an achievement
app.post('/admin/achievements/delete/:id',authUser , authAdmin, (req, res) => {
  const achievementId = req.params.id;

  // SQL query to delete the achievement from the database
  const deleteQuery = 'DELETE FROM student_achievements WHERE id = ?';

  connection.query(deleteQuery, [achievementId], (err, result) => {
    if (err) {
      console.error('Error deleting achievement:', err);
      req.flash('error', 'Failed to delete achievement');
      return res.redirect('/admin/achievements');
    }

    req.flash('success', 'Achievement deleted successfully');
    res.redirect('/admin/achievements');
  });
});






// Display all schedules with optional searchc
app.get('/admin/meeting_schedule',authUser , authAdmin, (req, res) => {
  const searchTerm = req.query.search || '';

  let sql = 'SELECT * FROM schedules';
  let params = [];

  if (searchTerm) {
    sql += ' WHERE name LIKE ?';
    params.push(`%${searchTerm}%`);
  }

  connection.query(sql, params, (err, results) => {
    console.log(results)
    if (err) throw err;
    res.render('Admin/Meeting_schedule(Jiayi)/meeting_schedule', {
      schedules: results,
      success: req.flash('success'),
      errors: req.flash('error'),
      searchTerm: searchTerm
    });
  });
});

// Route to render the form and fetch IG categories and IGs
app.get('/admin/schedule/new',authUser , authAdmin, (req, res) => {
  // Fetch IG categories from the database
  connection.query('SELECT id, name FROM ig_categories', (err, categories) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Database query error");
    }

    // Fetch interest groups (IGs)
    connection.query('SELECT id, name FROM interest_groups', (err, igs) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Database query error");
      }
      console.log(igs)
      // Render the form and pass IG categories and IGs to the template
      res.render('Admin/Meeting_schedule(Jiayi)/new_schedule', {
        categories, // Pass categories for IG categories dropdown
        igs,        // Pass IGs for the IG name dropdown
        errors: req.flash('error'),
        success: req.flash('success')
      });
    });
  });
});


app.post('/admin/schedule/new',authUser , authAdmin ,(req, res) => {
  const { name, meeting_schedule, advisor, category_id } = req.body;
  
  // Validate the input
  if (!name || !meeting_schedule || !advisor || !category_id) {
    req.flash('error', 'All fields are required.');
    return res.redirect('/admin/schedule/new');
  }

  // Query to check if the interest group exists by its name
  const sql = "SELECT name FROM interest_groups WHERE id = ?";
  connection.query(sql, [name], (err, results) => {
    if (err) {
      console.error(err);
      req.flash('error', 'An error occurred while checking the interest group.');
      return res.redirect('/admin/schedule/new');
    }

    if (results.length === 0) {
      // If no interest group is found with that name
      req.flash('error', 'No matching Interest Group found.');
      return res.redirect('/admin/schedule/new');
    } else {
      // Use the first result (assuming unique names)

      // Insert the new schedule with the retrieved interest group ID
      connection.query(
        'INSERT INTO schedules (name, meeting_schedule, advisor, category_id) VALUES (?, ?, ?, ?)',
        [results[0].name, meeting_schedule, advisor, category_id], 
        (err) => {
          if (err) {
            console.error(err);
            req.flash('error', 'An error occurred while creating the schedule.');
            return res.redirect('/admin/schedule/new');
          }

          req.flash('success', 'Schedule created successfully!');
          res.redirect('/admin/meeting_schedule'); // Redirect to meeting schedule page
        }
      );
    }
  });
});

// Show form to edit a schedule
app.get('/admin/edit_schedule/:id',authUser , authAdmin, (req, res) => {
  const id = req.params.id;

  connection.query('SELECT * FROM schedules WHERE id = ?', [id], (err, results) => {
    if (err) throw err;
    if (results.length === 0) {
      req.flash('error', 'Schedule not found');
      return res.redirect('/admin/meeting_schedule');
    }

    res.render('Admin/Meeting_schedule(Jiayi)/edit_schedule', {
      ig: results[0],
      errors: req.flash('error'),
      success: req.flash('success')
    });
  });
});

// Handle update to a schedule
app.post('/admin/edit_schedule/:id',authUser , authAdmin, (req, res) => {
  const id = req.params.id;
  let { name, meeting_schedule, advisor } = req.body;

  // Validate the input fields
  if (!name || !meeting_schedule || !advisor) {
    req.flash('error', 'All fields are required.');
    return res.redirect(`/admin/edit_schedule/${id}`);
  }

  // Convert datetime-local (like '2025-07-23T14:30') to MySQL datetime format
  meeting_schedule = meeting_schedule.replace('T', ' ') + ':00';

  connection.query(
    'UPDATE schedules SET name = ?, meeting_schedule = ?, advisor = ? WHERE id = ?',
    [name, meeting_schedule, advisor, id],
    (err) => {
      if (err) throw err;
      req.flash('success', 'Schedule updated successfully!');
      // Use the correct redirection path
      res.redirect(`/admin/meeting_schedule`);
    }
  );
});

app.post('/admin/delete_schedule/:id',authUser , authAdmin, (req, res) => {
  const id = req.params.id;

  connection.query('DELETE FROM schedules WHERE id = ?', [id], (err, result) => {
    if (err) {
      req.flash('error', 'Failed to delete schedule.');
      return res.redirect('/admin/meeting_schedule');
    }
    req.flash('success', 'Schedule deleted successfully.');
    res.redirect('/admin/meeting_schedule');
  });
});





// // POST: Update admin profile
app.post('/admin/profile/update',authUser , authAdmin, upload.single('profile_image'), (req, res) => {
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


app.get('/admin/schedules/:id/rsvps', (req, res) => {
  const scheduleId = req.params.id;

  const sql = `
    SELECT r.*, s.name AS schedule_name, s.meeting_schedule, 
           i.name AS ig_name, u.username AS user_name, u.email
    FROM ig_schedule_rsvps r
    JOIN schedules s ON r.schedule_id = s.id
    JOIN interest_groups i ON s.category_id = i.id
    JOIN users u ON r.id = u.id
    WHERE r.schedule_id = ?;
  `;

  connection.query(sql, [scheduleId], (err, results) => {
    if (err) {
      console.error('Failed to fetch schedule:', err);
      req.flash('error', 'Failed to load RSVP records');
      return res.redirect('/admin/schedules');
    }

    res.render('Admin/Schedule(Weijie)/viewRsvps', {
      rsvps: results,
      schedule: results[0] || {},
      success: req.flash('success'),
      error: req.flash('error')
    });
  });
});




app.get('/admin/schedules',authUser , authAdmin,(req, res) => {
  const sql = `
    SELECT s.*, 
           COUNT(r.id) AS rsvp_count,
           i.name AS ig_name
    FROM schedules s
    LEFT JOIN ig_schedule_rsvps r ON s.id = r.schedule_id
    LEFT JOIN interest_groups i ON s.category_id = i.id
    GROUP BY s.id
    ORDER BY s.meeting_schedule DESC`;

  connection.query(sql, (err, results) => {
    if (err) {
      console.error('Schedule fetch error:', err);
      return res.status(500).send('Database error');
    }

    res.render('Admin/Schedule(Weijie)/viewRsvps', {
      schedule: results,
      rsvps: [], 
      success: req.flash('success'),
      error: req.flash('error')
    });
  });
});


app.get('/students/dashboard', authUser, (req, res) => {
  const studentId = req.session.user.id;

  // Get student details
  connection.query('SELECT * FROM users WHERE id = ? AND roles = "student"', [studentId], (err, studentResults) => {
    if (err) throw err;
    const student = studentResults[0];

    // Get upcoming events linked via the student's interest groups
    const eventsQuery = `
      SELECT DISTINCT e.*
      FROM events e
      JOIN interest_groups ig ON e.id = ig.category_id
      JOIN members m ON m.ig_id = ig.id
      WHERE m.student_id = ? AND e.date >= NOW()
    `;

    connection.query(eventsQuery, [studentId], (err, eventResults) => {
      if (err) throw err;

      // Get the student's joined IGs
      const joinedGroupsQuery = `
        SELECT g.* FROM interest_groups g
        JOIN members m ON g.id = m.ig_id
        WHERE m.student_id = ?
      `;

      connection.query(joinedGroupsQuery, [studentId], (err, groupResults) => {
        if (err) throw err;

        // Get all IGs (for dropdowns or filtering)
        connection.query("SELECT * FROM interest_groups", (err, allIGResults) => {
          if (err) throw err;

          // Get recent announcements
          connection.query('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5', (err, announcementResults) => {
            if (err) throw err;

            // Get all student achievements
            connection.query("SELECT * FROM student_achievements WHERE student_id = ?", [studentId], (err, achievementResults) => {
              if (err) throw err;

              res.render('Student/studentDashboard', {
                student: student,
                events: eventResults,
                interestGroups: groupResults,
                announcements: announcementResults,
                achievements: achievementResults,
                allIGs: allIGResults,
                activePage: "dashboard"
              });
            });
          });
        });
      });
    });
  });
});

app.post('/student/request-join', authUser, (req, res) => {
  const { ig_id } = req.body;
  const studentId = req.session.user.id;

  const query = `INSERT INTO ig_join_requests (student_id, ig_id) VALUES (?, ?)`;
  connection.query(query, [studentId, ig_id], (err) => {
    if (err) {
      req.flash('error', 'Failed to send request');
      return res.redirect('/students/dashboard');
    }
    req.flash('success', 'Join request sent successfully!');
    res.redirect('/students/dashboard');
  });
});


app.get('/admin/join-requests',authUser, (req, res) => {
  const query = `
   SELECT r.*, s.name AS student_name, ig.name AS ig_name
FROM ig_join_requests r
JOIN students s ON r.student_id = s.id
JOIN interest_groups ig ON r.ig_id = ig.id

  `;

  connection.query(query, (err, results) => {
    if (err) throw err;
    res.render('Admin/JoinRequestIG(Weijie)/manageJoinRequests', { requests: results });
  });
});


app.post('/admin/join-requests/:id/approve',authUser, authAdmin, (req, res) => {
  const requestId = req.params.id;

  // First, approve the request
  const updateQuery = `UPDATE ig_join_requests SET status = 'approved' WHERE id = ?`;
  connection.query(updateQuery, [requestId], (err) => {
    if (err) throw err;

    // Then insert into members table
    const insertMemberQuery = `
      INSERT INTO members (student_id, ig_id)
      SELECT student_id, ig_id FROM ig_join_requests WHERE id = ?
    `;
    connection.query(insertMemberQuery, [requestId], (err2) => {
      if (err2) throw err2;
      res.redirect('/admin/join-requests');
    });
  });
});

app.post('/admin/join-requests/:id/reject', authUser, authAdmin ,(req, res) => {
  const requestId = req.params.id;
  const query = `UPDATE ig_join_requests SET status = 'rejected' WHERE id = ?`;
  connection.query(query, [requestId], (err) => {
    if (err) throw err;
    res.redirect('/admin/join-requests');
  });
});


app.get('/student/profile', authUser, (req, res) => {
  const studentId = req.session?.user?.id;

  if (!studentId) {
    req.flash('error', 'Session expired. Please log in again.');
    return res.redirect('/login');
  }

  connection.query(
    'SELECT * FROM users WHERE id = ? AND roles = "student"',
    [studentId],
    (err, results) => {
      if (err || results.length === 0) {
        req.flash('error', 'Student not found.');
        return res.redirect('/');
      }

      const student = results[0];
      const loginInfo = student.last_login
        ? `🕒 ${new Date(student.last_login).toLocaleString('en-SG')} – ${student.last_browser} (${student.login_success ? '✅' : '❌'})`
        : 'No login info yet';

      res.render('Student/profile(weijie)/profile', {
        student,
        loginInfo,
        activePage: 'profile', // ✅ Add this line
        success: req.flash('success'),
        error: req.flash('error')
      });
    }
  );
});


app.post('/student/profile/update',authUser, upload.single('profileImage'), (req, res) => {
  const { fullname, email, phone_number, bio } = req.body;
  const profileImage = req.file ? req.file.filename : null;
  const studentId = req.session.user.id;

  if (!fullname || !email || !phone_number) {
    req.flash('error', 'Please fill in all required fields.');
    return res.redirect('/student/profile');
  }

  const updateSql = profileImage
    ? 'UPDATE users SET fullname = ?, email = ?, phone_number = ?, bio = ?, profile_image = ? WHERE id = ?'
    : 'UPDATE users SET fullname = ?, email = ?, phone_number = ?, bio = ? WHERE id = ?';

  const values = profileImage
    ? [fullname, email, phone_number, bio, profileImage, studentId]
    : [fullname, email, phone_number, bio, studentId];

  connection.query(updateSql, values, (err, result) => {
    if (err) {
      console.error('❌ Update error:', err);
      req.flash('error', 'Database error.');
      return res.redirect('/student/profile');
    }

    req.flash('success', 'Profile updated successfully.');
    res.redirect('/student/profile');
  });
});


app.post('/student/profile/reset-password',authUser, (req, res) => {
  const userId = req.session.user?.id;
  const { newPassword, confirmPassword } = req.body;

  if (!userId) {
    req.flash('error', 'Please log in.');
    return res.redirect('/login');
  }

  if (newPassword !== confirmPassword) {
    req.flash('error', 'Passwords do not match.');
    return res.redirect('/student/profile');
  }

  if (newPassword.length < 8) {
    req.flash('error', 'Password must be at least 8 characters.');
    return res.redirect('/student/profile');
  }

  // You can add more strength checks here if needed

  // Hash new password
  bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
    if (err) {
      req.flash('error', 'Password hashing failed.');
      return res.redirect('/student/profile');
    }

    const sql = `UPDATE users SET password = ? WHERE id = ? AND roles = 'student'`;
    connection.query(sql, [hashedPassword, userId], (err, result) => {
      if (err) {
        console.error('❌ Password update error:', err);
        req.flash('error', 'Database error during password update.');
        return res.redirect('/student/profile');
      }

      req.flash('success', 'Password updated successfully!');
      res.redirect('/student/profile');
    });
  });
});

app.get('/events',authUser, (req, res) => {
  const sql = `
    SELECT e.*, ig.name AS ig_name
    FROM events e
    JOIN interest_groups ig ON e.ig_id = ig.id
    ORDER BY e.date ASC
  `;

  connection.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error fetching events:', err);
      return res.status(500).send('Internal Server Error');
    }
    res.render('Student/events(Deen)/events', { events: results });
  });
});



app.post('/students/igs/join/:id',authUser, (req, res) => {
  const igId = req.params.id;
  const studentId = req.session.user.id;

  const checkJoinRequestSql = `
    SELECT * FROM ig_join_requests 
    WHERE student_id = ? AND ig_id = ? AND status = 'pending'
  `;
  const checkMemberSql = `
    SELECT * FROM members 
    WHERE student_id = ? AND ig_id = ?
  `;

  // Check if already requested to join (pending) or already a member
  connection.query(checkJoinRequestSql, [studentId, igId], (err1, joinResults) => {
    if (err1) {
      console.error('❌ Join check (requests) error:', err1);
      req.flash('error', 'Something went wrong.');
      return res.redirect('/students/igs');
    }

    if (joinResults.length > 0) {
      req.flash('error', 'You already requested to join this IG.');
      return res.redirect('/students/igs');
    }

    connection.query(checkMemberSql, [studentId, igId], (err2, memberResults) => {
      if (err2) {
        console.error('❌ Join check (members) error:', err2);
        req.flash('error', 'Something went wrong.');
        return res.redirect('/students/igs');
      }

      if (memberResults.length > 0) {
        req.flash('error', 'You are already a member of this IG.');
        return res.redirect('/students/igs');
      }

      // Insert join request into ig_join_requests
      const insertSql = `
        INSERT INTO ig_join_requests (student_id, ig_id, request_date, status)
        VALUES (?, ?, NOW(), 'pending')
      `;
      connection.query(insertSql, [studentId, igId], (err3) => {
        if (err3) {
          console.error('❌ Request insert error:', err3);
          req.flash('error', 'Failed to request join.');
          return res.redirect('/students/igs');
        }

        req.flash('success', 'Request sent successfully!');
        res.redirect('/students/igs');
      });
    });
  });
});



app.get('/students/igs',authUser , (req, res) => {
  const studentId = req.session.user.id;

  const igQuery = `
    SELECT ig.id, ig.name, ig.description, cat.name AS category_name
    FROM interest_groups ig
    JOIN ig_categories cat ON ig.category_id = cat.id
  `;

  const categoryQuery = `SELECT * FROM ig_categories`;

  const joinedQuery = `
    SELECT ig_id FROM members WHERE student_id = ?
  `;

  const requestedQuery = `
    SELECT ig_id, status FROM ig_join_requests WHERE student_id = ?
  `;

  connection.query(igQuery, (err1, igs) => {
    if (err1) {
      console.error('❌ Error fetching IGs:', err1);
      return res.send('Error loading IGs');
    }

    connection.query(categoryQuery, (err2, categories) => {
      if (err2) {
        console.error('❌ Error fetching categories:', err2);
        return res.send('Error loading categories');
      }

      connection.query(joinedQuery, [studentId], (err3, joined) => {
        if (err3) {
          console.error('❌ Error fetching joined IGs:', err3);
          return res.send('Error loading joined IGs');
        }

        const joinedIGIds = joined.map(j => j.ig_id);

        connection.query(requestedQuery, [studentId], (err4, requests) => {
          if (err4) {
            console.error('❌ Error fetching join requests:', err4);
            return res.send('Error loading join requests');
          }

          const requestedIGIds = requests
            .filter(r => r.status === 'pending')
            .map(r => r.ig_id);

          const rejectedIGIds = requests
            .filter(r => r.status === 'rejected')
            .map(r => r.ig_id);

          res.render('Student/interest_group(Jiayi)/ig', {
            igs,
            categories,
            joinedIGIds,
            requestedIGIds,
            rejectedIGIds,
            activePage: 'igs'
          });
        });
      });
    });
  });
});





app.get('/students/announcements' , authUser, (req, res) => {
  const sql = `
    SELECT * FROM announcements
    WHERE target_audience IN ('Students', 'All')
    ORDER BY created_at DESC
  `;
  connection.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Announcement fetch error:', err);
      req.flash('error', 'Failed to load announcements.');
      return res.redirect('/students/dashboard');
    }

    res.render('Student/Announcement(Weijie)/announcement', {
      announcements: results,
      success: req.flash('success'),
      error: req.flash('error')
    });
  });
});


app.get('/students/achievements',authUser , (req, res) => {
  const studentId = req.session.user.id; // Assuming session stores logged-in student

  const sql = `
    SELECT * FROM student_achievements
    WHERE student_id = ?
    ORDER BY date_awarded DESC
  `;

  connection.query(sql, [studentId], (err, results) => {
    if (err) {
      console.error("❌ Achievement fetch error:", err);
      return res.status(500).send("Server Error");
    }

    res.render('Student/Achievement(Siti)/achievement', {
      achievements: results
    });
  });
});
app.get('/students/gallery', (req, res) => {
  const galleryQuery = `
    SELECT g.*, u.username AS student_name
    FROM galleries g
    JOIN users u ON g.student_id = u.id
    ORDER BY g.upload_date DESC
  `;

  const commentsQuery = `
    SELECT gc.*, u.username AS commenter_name
    FROM gallery_comments gc
    JOIN users u ON gc.user_id = u.id
    ORDER BY gc.created_at ASC
  `;

  connection.query(galleryQuery, (err, galleries) => {
    if (err) {
      console.error("❌ Gallery Query Error:", err);
      return res.status(500).send("Error fetching gallery");
    }

    connection.query(commentsQuery, (err, comments) => {
      if (err) {
        console.error("❌ Comments Query Error:", err);
        return res.status(500).send("Error fetching comments");
      }

      // Group comments by gallery_id
      const groupedComments = {};
      comments.forEach(c => {
        if (!groupedComments[c.gallery_id]) groupedComments[c.gallery_id] = [];
        groupedComments[c.gallery_id].push(c);
      });

      res.render('Student/Gallary(Kal)/Gallary', {
        galleries,
        commentsByGallery: groupedComments
      });
    });
  });
});


app.post('/students/gallery/:id/comment', authUser ,(req, res) => {
  const gallery_id = req.params.id;
  const { comment } = req.body;
  const userId = req.session.user?.id;

  if (!userId) {
    req.flash('error', 'Please log in to comment.');
    return res.redirect('/login');
  }

  if (!comment.trim()) {
    req.flash('error', 'Comment cannot be empty.');
    return res.redirect('/students/gallery');
  }

  const insertSql = `
    INSERT INTO gallery_comments (gallery_id, user_id, comment, created_at)
    VALUES (?, ?, ?, NOW())
  `;

  connection.query(insertSql, [gallery_id, userId, comment], (err) => {
    if (err) {
      console.error('❌ Comment insert error:', err);
      req.flash('error', 'Failed to post comment.');
      return res.redirect('/students/gallery');
    }

    req.flash('success', 'Comment posted successfully.');
    res.redirect('/students/gallery');
  });
});


app.get('/students/schedule', authUser, (req, res) => {
  const studentId = req.session.user.id;

  const sql = `
    SELECT s.*, r.status AS rsvp_status
    FROM schedules s
    LEFT JOIN ig_schedule_rsvps r ON s.id = r.schedule_id AND r.student_id = ?
    ORDER BY s.meeting_schedule ASC`;

  connection.query(sql, [studentId], (err, results) => {
    if (err) {
      console.error('❌ MySQL Error:', err);
      return res.send('Database error');
    }

    res.render('Student/Schedule(Weijie)/schedule', { schedule: results });
  });
});




app.post('/students/schedule/:id/cancel-rsvp' , authUser , (req, res) => {
  const scheduleId = req.params.id;
  const studentId = req.session.user.id;

  const sql = `DELETE FROM schedule_rsvps WHERE schedule_id = ? AND student_id = ?`;

  connection.query(sql, [scheduleId, studentId], (err, result) => {
    if (err) {
      req.flash('error', 'Error canceling RSVP');
    }
    res.redirect('/students/schedule');
  });
});



app.post('/students/schedule/:id/rsvp',authUser , (req, res) => {
  const scheduleId = req.params.id;
  const studentId = req.session.user.id;
  const status = req.body.status;

  const sql = `INSERT INTO schedule_rsvps (schedule_id, student_id, status)
               VALUES (?, ?, ?)
               ON DUPLICATE KEY UPDATE status = ?`;

  connection.query(sql, [scheduleId, studentId, status, status], (err, result) => {
    if (err) {
      req.flash('error', 'Error saving RSVP');
    }
    res.redirect('/students/schedule');
  });
});

// ---------- Start Server ----------
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');

});
