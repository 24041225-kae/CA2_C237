const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const app = express();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); 
    }
});

const upload = multer({ storage: storage });

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Group5@123?',
    database: 'igconnect',
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Set up view engine
app.set('view engine', 'ejs');
//  enable static files
app.use(express.static('public'));
// enable form processing
app.use(express.urlencoded({
    extended: false
}));

// Insert code for Session Middleware below 
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    // Session expires after 1 week of inactivity
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } 
}));

app.use(flash());

// Define routes
// show all galleries
app.get('/galleries', (req, res) => {
    connection.query('SELECT * FROM galleries', (err, results) => {
        if (err) return res.status(500).send('Database Error');
        res.render('galleries', { galleries: results, messages: req.flash('success') });
    });
});

// show gallery + comments
app.get('/galleries/:id', (req, res) => {
    const id = req.params.id;

    const gallerySql = 'SELECT * FROM galleries WHERE id = ?';
    const commentsSql = 'SELECT * FROM gallery_comments WHERE gallery_id = ? ORDER BY created_at DESC';

    connection.query(gallerySql, [id], (err, galleryResult) => {
        if (err) return res.status(500).send('Error fetching gallery');
        if (galleryResult.length === 0) return res.status(404).send('Gallery not found');

        connection.query(commentsSql, [id], (err, commentResults) => {
            if (err) return res.status(500).send('Error fetching comments');
            res.render('gallery', {
                gallery: galleryResult[0],
                comments: commentResults,
                messages: req.flash('success')
            });
        });
    });
});

// add gallery
app.post('/galleries', upload.single('image'), (req, res) => {
    const { ig_id, caption, upload_date } = req.body;
    const media_url = req.file ? req.file.filename : null;

    const sql = 'INSERT INTO galleries (ig_id, caption, upload_date, media_url) VALUES (?, ?, ?, ?)';
    connection.query(sql, [ig_id, caption, upload_date, media_url], (err) => {
        if (err) return res.status(500).send('Error creating gallery');
        req.flash('success', 'Gallery created successfully');
        res.redirect('/galleries');
    });
});

// update gallery
app.post('/galleries/:id/edit', upload.single('image'), (req, res) => {
    const id = req.params.id;
    const { ig_id, caption, upload_date, currentImage } = req.body;
    const media_url = req.file ? req.file.filename : currentImage;

    const sql = 'UPDATE galleries SET ig_id = ?, caption = ?, upload_date = ?, media_url = ? WHERE id = ?';
    connection.query(sql, [ig_id, caption, upload_date, media_url, id], (err) => {
        if (err) return res.status(500).send('Error updating gallery');
        req.flash('success', 'Gallery updated');
        res.redirect('/galleries');
    });
});

// delete gallery
app.get('/galleries/:id/delete', (req, res) => {
    const id = req.params.id;
    connection.query('DELETE FROM galleries WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).send('Error deleting gallery');
        req.flash('success', 'Gallery deleted');
        res.redirect('/galleries');
    });
});

/* ---------------------- Comments ---------------------- */

// add comment
app.post('/galleries/:id/comment', (req, res) => {
    const galleryId = req.params.id;
    const { comment, student_id } = req.body;

    const sql = 'INSERT INTO gallery_comments (gallery_id, student_id, comment, created_at) VALUES (?, ?, ?, NOW())';
    connection.query(sql, [galleryId, student_id, comment], (err) => {
        if (err) return res.status(500).send('Error adding comment');
        req.flash('success', 'Comment added');
        res.redirect(`/galleries/${galleryId}`);
    });
});

// delete comment
app.get('/comments/:id/delete', (req, res) => {
    const commentId = req.params.id;

    connection.query('SELECT gallery_id FROM gallery_comments WHERE id = ?', [commentId], (err, result) => {
        if (err || result.length === 0) return res.status(500).send('Error finding comment');
        const galleryId = result[0].gallery_id;

        connection.query('DELETE FROM gallery_comments WHERE id = ?', [commentId], (err) => {
            if (err) return res.status(500).send('Error deleting comment');
            req.flash('success', 'Comment deleted');
            res.redirect(`/galleries/${galleryId}`);
        });
    });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
