const express = require('express');
const multer = require('multer');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const app = express();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/'); 
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(session({
    secret: 'YourStrongSecretHere', 
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } 
}));
app.use(flash());


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public'))); 


const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Group5@123?',
    database: 'igconnect',
    port: 3306 
});

connection.connect((err) => {
    if (err) {
        console.error('Database connection error:', err.message);
        return;
    }
    console.log('Connected to MySQL database');
});


app.use((req, res, next) => {
    // dummy user
    if (!req.session.user) {
        req.session.user = {
            id: 100, 
            username: 'Siti',
            email: 'siti@example.com',
            role: 'user' 
        };
    }
    next();
});

const checkAuthenticated = (req, res, next) => {
    if (req.session.user) { 
        return next();
    }
    res.redirect('/');
};

const checkAdmin = (req, res, next) => {

    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    req.flash('error', 'Access denied. You must be an administrator.');
    res.redirect('/'); 
};

// --- ROUTES ---

// Root route - directly redirect to members list for student view
app.get('/', (req, res) => {
    res.redirect('/members');
});

// --- IG ROLES ROUTES ---
// View all IG roles 
app.get('/ig_roles', checkAuthenticated, (req, res) => {
    connection.query('SELECT * FROM ig_roles', (error, results) => {
        if (error) {
            console.error('Error fetching IG roles:', error);
            req.flash('error', 'Error fetching IG roles: ' + error.message);
            return res.redirect('/');
        }
        res.render('IGRolesList', { 
            igRoles: results,
            user: req.session.user, 
            messages: req.flash('success'),
            errors: req.flash('error')
        });
    });
});

// Add new IG role form 
app.get('/addIgRole', checkAdmin, (req, res) => {
    res.render('addIgRole', {
        user: req.session.user,
        messages: req.flash('success'),
        errors: req.flash('error')
    });
});

// Add new IG role 
app.post('/addIgRole', checkAdmin, (req, res) => {
    const { title, description } = req.body;
    if (!title) {
        req.flash('error', 'Title is required for IG Role.');
        return res.redirect('/addIgRole');
    }
    const sql = 'INSERT INTO ig_roles (title, description) VALUES (?, ?)';
    connection.query(sql, [title, description], (error, results) => {
        if (error) {
            console.error('Error adding IG role:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                req.flash('error', 'Role with this title already exists.');
                return res.redirect('/addIgRole');
            }
            req.flash('error', 'Error adding IG role: ' + error.message);
            return res.redirect('/ig_roles');
        }
        req.flash('success', 'IG Role added successfully!');
        res.redirect('/ig_roles');
    });
});

// Get data for updating an IG role 
app.get('/updateIgRole/:id', checkAdmin, (req, res) => {
    const roleId = req.params.id;
    connection.query('SELECT * FROM ig_roles WHERE id = ?', [roleId], (error, results) => {
        if (error) {
            console.error('Error fetching IG role for update:', error);
            req.flash('error', 'Error fetching IG role: ' + error.message);
            return res.redirect('/ig_roles');
        }
        if (results.length > 0) {
            res.render('updateIgRole', {
                igRole: results[0],
                user: req.session.user,
                messages: req.flash('success'),
                errors: req.flash('error')
            });
        } else {
            req.flash('error', 'IG Role not found.');
            res.redirect('/ig_roles');
        }
    });
});

// Update IG role 
app.post('/updateIgRole/:id', checkAdmin, (req, res) => {
    const roleId = req.params.id;
    const { title, description } = req.body;
    if (!title) {
        req.flash('error', 'Title is required for IG Role update.');
        return res.redirect(`/updateIgRole/${roleId}`);
    }
    const sql = 'UPDATE ig_roles SET title = ?, description = ? WHERE id = ?';
    connection.query(sql, [title, description, roleId], (error, results) => {
        if (error) {
            console.error('Error updating IG role:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                req.flash('error', 'Role with this title already exists.');
                return res.redirect(`/updateIgRole/${roleId}`);
            }
            req.flash('error', 'Error updating IG role: ' + error.message);
            return res.redirect('/ig_roles');
        }
        if (results.affectedRows === 0) {
            req.flash('error', 'IG Role not found or no changes made.');
        } else {
            req.flash('success', 'IG Role updated successfully!');
        }
        res.redirect('/ig_roles');
    });
});

// Delete IG role 
app.get('/deleteIgRole/:id', checkAdmin, (req, res) => {
    const roleId = req.params.id;

    connection.query('SELECT COUNT(*) AS count FROM members WHERE role_id = ?', [roleId], (error, results) => {
        if (error) {
            console.error('Error checking members for role deletion:', error);
            req.flash('error', 'Error checking members for role deletion: ' + error.message);
            return res.redirect('/ig_roles');
        }
        if (results[0].count > 0) {
            req.flash('error', 'Cannot delete role: Members are currently assigned to this role.');
            return res.redirect('/ig_roles');
        }
        connection.query('DELETE FROM ig_roles WHERE id = ?', [roleId], (deleteError, deleteResults) => {
            if (deleteError) {
                console.error('Error deleting IG role:', deleteError);
                req.flash('error', 'Error deleting IG role: ' + deleteError.message);
                return res.redirect('/ig_roles');
            }
            if (deleteResults.affectedRows === 0) {
                req.flash('error', 'IG Role not found for deletion.');
            } else {
                req.flash('success', 'IG Role deleted successfully!');
            }
            res.redirect('/ig_roles');
        });
    });
});


// --- IG MEMBERS ROUTES ---
// View all members 
app.get('/members', checkAuthenticated, (req, res) => {
    const sql = `
        SELECT m.id, m.student_id, m.ig_id, ir.title AS role_name, m.joined_date
        FROM members m
        JOIN ig_roles ir ON m.role_id = ir.id
    `;
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Error fetching members:', error);
            req.flash('error', 'Error fetching members: ' + error.message);
            return res.redirect('/');
        }
        res.render('memberslist', { 
            members: results,
            user: req.session.user, 
            searchPerformed: false,
            messages: req.flash('success'),
            errors: req.flash('error')
        });
    });
});

// Add new member form 
app.get('/addMember', checkAdmin, (req, res) => {
    connection.query('SELECT id, title FROM ig_roles', (error, roles) => {
        if (error) {
            console.error('Error fetching roles for add member form:', error);
            req.flash('error', 'Error fetching roles for form: ' + error.message);
            return res.redirect('/members');
        }
        res.render('addMember', {
            roles: roles,
            user: req.session.user,
            messages: req.flash('success'),
            errors: req.flash('error')
        });
    });
});

// Add new member 
app.post('/addMember', checkAdmin, (req, res) => {
    const { student_id, ig_id, role_id, joined_date } = req.body;
    if (!student_id || !ig_id || !role_id || !joined_date) {
        req.flash('error', 'All fields are required for adding a member.');
        return res.redirect('/addMember');
    }
    const sql = 'INSERT INTO members (student_id, ig_id, role_id, joined_date) VALUES (?, ?, ?, ?)';
    connection.query(sql, [student_id, ig_id, role_id, joined_date], (error, results) => {
        if (error) {
            console.error('Error adding member:', error);
            req.flash('error', 'Error adding member: ' + error.message);
            return res.redirect('/addMember');
        }
        req.flash('success', 'Member added successfully!');
        res.redirect('/members');
    });
});

// Get data for updating a member 
app.get('/updateMember/:id', checkAdmin, (req, res) => {
    const memberId = req.params.id;
    const sqlMember = `
        SELECT m.id, m.student_id, m.ig_id, m.role_id, m.joined_date, ir.title AS role_name
        FROM members m
        JOIN ig_roles ir ON m.role_id = ir.id
        WHERE m.id = ?
    `;
    connection.query(sqlMember, [memberId], (error, memberResults) => {
        if (error) {
            console.error('Error fetching member for update:', error);
            req.flash('error', 'Error fetching member: ' + error.message);
            return res.redirect('/members');
        }
        if (memberResults.length === 0) {
            req.flash('error', 'Member not found.');
            return res.redirect('/members');
        }

        connection.query('SELECT id, title FROM ig_roles', (roleError, roleResults) => {
            if (roleError) {
                console.error('Error fetching roles for update member form:', roleError);
                req.flash('error', 'Error fetching roles for form: ' + roleError.message);
                return res.redirect('/members');
            }
            res.render('updateMember', {
                member: memberResults[0],
                roles: roleResults,
                user: req.session.user,
                messages: req.flash('success'),
                errors: req.flash('error')
            });
        });
    });
});

// Update member 
app.post('/updateMember/:id', checkAdmin, (req, res) => {
    const memberId = req.params.id;
    const { student_id, ig_id, role_id, joined_date } = req.body;
    if (!student_id || !ig_id || !role_id || !joined_date) {
        req.flash('error', 'All fields are required for updating a member.');
        return res.redirect(`/updateMember/${memberId}`);
    }
    const sql = 'UPDATE members SET student_id = ?, ig_id = ?, role_id = ?, joined_date = ? WHERE id = ?';
    connection.query(sql, [student_id, ig_id, role_id, joined_date, memberId], (error, results) => {
        if (error) {
            console.error('Error updating member:', error);
            req.flash('error', 'Error updating member: ' + error.message);
            return res.redirect(`/updateMember/${memberId}`);
        }
        if (results.affectedRows === 0) {
            req.flash('error', 'Member not found or no changes made.');
        } else {
            req.flash('success', 'Member updated successfully!');
        }
        res.redirect('/members');
    });
});

// Remove member 
app.get('/deleteMember/:id', checkAdmin, (req, res) => {
    const memberId = req.params.id;
    connection.query('DELETE FROM members WHERE id = ?', [memberId], (error, results) => {
        if (error) {
            console.error('Error deleting member:', error);
            req.flash('error', 'Error deleting member: ' + error.message);
            return res.redirect('/members');
        }
        if (results.affectedRows === 0) {
            req.flash('error', 'Member not found for deletion.');
        } else {
            req.flash('success', 'Member removed successfully!');
        }
        res.redirect('/members');
    });
});

// Search members by IG and student name 
app.get('/searchMembers', checkAuthenticated, (req, res) => {
    const { ig_id, student_name } = req.query;
    let sql = `
        SELECT m.id, m.student_id, m.ig_id, ir.title AS role_name, m.joined_date
        FROM members m
        JOIN ig_roles ir ON m.role_id = ir.id
        WHERE 1=1
    `;
    const queryParams = [];

    if (ig_id) {
        sql += ' AND m.ig_id LIKE ?';
        queryParams.push(`%${ig_id}%`);
    }
    if (student_name) {
        sql += ' AND m.student_id LIKE ?';
        queryParams.push(`%${student_name}%`);
    }

    connection.query(sql, queryParams, (error, results) => {
        if (error) {
            console.error('Error searching members:', error);
            req.flash('error', 'Error searching members: ' + error.message);
            return res.redirect('/members');
        }
        res.render('memberslist', { 
            members: results,
            user: req.session.user,
            searchPerformed: true,
            req: req,
            messages: req.flash('success'),
            errors: req.flash('error')
        });
    });
});


// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});