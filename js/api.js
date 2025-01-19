const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const path = require('path');

const router = express.Router();

// Path to config.txt file
const configPath = path.join(__dirname, '..', 'config.txt');

// Load database credentials from config.txt
let config;
try {
  config = fs.readFileSync(configPath, 'utf-8');
} catch (err) {
  console.error('Error reading the config file:', err);
  process.exit(1);  // Exit if the config file is not found or can't be read
}

const [host, user, password, database] = config.split('\n');

// Create MySQL connection
const db = mysql.createConnection({
  host: host.trim(),
  user: user.trim(),
  password: password.trim(),
  database: database.trim(),
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the MySQL database.');
});

// Update session configuration to last 10 minutes
router.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 10 * 60 * 1000 // 10 minutes in milliseconds
  }
}));

// API endpoint to handle form submissions
router.post('/submit-form', (req, res) => {
  const { name, email, subject, message } = req.body;

  // Validate input
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // Insert data into the contactus table
  const query = 'INSERT INTO contact_us (name, email, subject, message) VALUES (?, ?, ?, ?)';
  const values = [name, email, subject, message];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error inserting data:', err);
      return res.status(500).json({ error: 'Failed to save form data.' });
    }
    res.status(200).json({ message: 'Form submitted successfully!' });
  });
});

// Route to fetch testimonials
router.get('/testimonials', (req, res) => {
  const query = `
    SELECT 
      t.testimonial_id, 
      CONCAT(u.first_name, ' ', u.last_name) AS customer_name, 
      t.feedback, 
      t.rating, 
      DATE(t.created_at) AS created_date
    FROM testimonials t
    JOIN users u ON t.customer_id = u.id
    ORDER BY t.created_at DESC 
    LIMIT 8;
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch testimonials' });
    }
    res.json(results);
  });
});

router.get('/cars', async (req, res) => {
    const query = `SELECT * FROM cars`; 

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch testimonials' });
    }
    res.json(results);
  });
});

router.get('/cars/:car_id', async (req, res) => {
  const car_id = req.params.car_id;  // Use req.params to get the car_id from the URL
  
  // Use a parameterized query to avoid SQL injection
  const query = `SELECT * FROM cars WHERE car_id = ?`;

  db.query(query, [car_id], (err, results) => {
    if (err) {
      console.error('Error fetching car details:', err);
      return res.status(500).json({ error: 'Failed to fetch car details' });
    }
    
    // Check if a car was found
    if (results.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }

    // Return the car details in the response
    res.json(results[0]);  // Assuming the car_id is unique, take the first result
  });
});


// Signup API endpoint
router.post('/signup', (req, res) => {
  const { first_name, last_name, phone_number, ic_passport_number, email, license_number, username, password } = req.body;

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error hashing password' });
    }

    const sql = `INSERT INTO users (first_name, last_name, phone_number, ic_passport_number, email, license_number, username, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [first_name, last_name, phone_number, ic_passport_number, email, license_number, username, hashedPassword];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error inserting user data' });
      }

      // Create a session for the user (sign them in automatically)
      req.session.userId = result.insertId; // Store user ID in session

      res.json({ success: true, message: 'User signed up successfully' });
    });
  });
});

// Signup API endpoint
router.post('/adminsignup', (req, res) => {
  const { first_name, last_name, phone_number, ic_passport_number, email, license_number, username, password } = req.body;

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error hashing password' });
    }

    const sql = `INSERT INTO users (first_name, last_name, phone_number, ic_passport_number, email, license_number, username, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [first_name, last_name, phone_number, ic_passport_number, email, license_number, username, hashedPassword];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error inserting user data' });
      }

      res.json({ success: true, message: 'User signed up successfully' });
    });
  });
});

// Login route
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Query to get the user by username
  db.query('SELECT * FROM users WHERE username = ? ', [username], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error occurred.' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = results[0];

    // Compare the password with the hashed password stored in the DB
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error during password comparison.' });
      }

      if (isMatch) {
        // Password matches, create session
        req.session.user = user;
        res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
      } else {
        res.status(401).json({ error: 'Invalid username or password.' });
      }
    });
  });
});

// Login route
router.post('/adminlogin', (req, res) => {
  const { username, password } = req.body;

  // Query to get the user by username
  db.query('SELECT * FROM admin WHERE username = ? ', [username], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error occurred.' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = results[0];

    // Compare the password with the hashed password stored in the DB
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error during password comparison.' });
      }

      if (isMatch) {
        // Password matches, create session
        req.session.user = user;
        res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
      } else {
        res.status(401).json({ error: 'Invalid username or password.' });
      }
    });
  });
});
const checkSession = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'User not logged in' });
    }
    next();
};
router.get('/check-session', (req, res) => {
    if (req.session.user) {
        console.log('Session exists:', req.session.user); // Log user details
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        console.log('No session found');
        res.json({ loggedIn: false });
    }
});
router.post('/book-car', async (req, res) => {
    const { startDate, endDate, totalPrice, carId, userId } = req.body;

    // Validate the incoming data
    if (!startDate || !endDate || !totalPrice || !carId || !userId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert the booking into the database
    const query = `
        INSERT INTO bookings (car_id, user_id, start_date, end_date, total_price, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
    `;

    db.query(query, [carId, userId, startDate, endDate, totalPrice], (err, result) => {
        if (err) {
            console.error('Error creating booking:', err);
            return res.status(500).json({ error: 'Failed to create booking' });
        }

        res.json({ message: 'Booking successful!', bookingId: result.insertId });
    });
});

// Route to cancel a booking (update booking status to 'cancelled')
router.put('/cancel-booking/:bookingId', checkSession, (req, res) => {
    const bookingId = req.params.bookingId;

    // Query to update the booking status to 'cancelled'
    const query = 'UPDATE bookings SET status = ? WHERE booking_id = ? AND status != "cancelled"';

    db.query(query, ['cancelled', bookingId], (err, result) => {
        if (err) {
            console.error('Error cancelling booking:', err);
            return res.status(500).json({ error: 'Failed to cancel booking' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Booking not found or already cancelled' });
        }

        // Send success response with userId to reload bookings on frontend
        res.json({ success: true, userId: req.session.user.id });
    });
});
// Route to get the user's bookings
router.get('/get-bookings/:userId', checkSession, (req, res) => {
    const userId = req.params.userId;

    const query = `
        SELECT b.booking_id, CONCAT(c.make, ' ',c.model) AS car_name, b.start_date, b.end_date, b.total_price, b.status
        FROM bookings b
        JOIN cars c ON b.car_id = c.car_id
        WHERE b.user_id = ?
        ORDER BY b.start_date DESC
    `;

    db.query(query, [userId], (err, result) => {
        if (err) {
            console.error('Error fetching bookings:', err);
            return res.status(500).json({ error: 'Failed to fetch bookings' });
        }

        res.json({ bookings: result });
    });
});

// Route to delete the user's account
router.delete('/delete-account', checkSession, (req, res) => {
    const userId = req.session.user.id;

    // Start a transaction to ensure data integrity
    db.beginTransaction(err => {
        if (err) {
            console.error('Error starting transaction:', err);
            return res.status(500).json({ error: 'Failed to delete account' });
        }

        // Delete user's bookings first
        const deleteBookingsQuery = 'DELETE FROM bookings WHERE user_id = ?';
        db.query(deleteBookingsQuery, [userId], (err, result) => {
            if (err) {
                return db.rollback(() => {
                    console.error('Error deleting bookings:', err);
                    res.status(500).json({ error: 'Failed to delete bookings' });
                });
            }

            // Now delete the user from the users table
            const deleteUserQuery = 'DELETE FROM users WHERE id = ?';
            db.query(deleteUserQuery, [userId], (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Error deleting user:', err);
                        res.status(500).json({ error: 'Failed to delete user' });
                    });
                }

                // Commit the transaction after both queries succeed
                db.commit(err => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Error committing transaction:', err);
                            res.status(500).json({ error: 'Failed to commit transaction' });
                        });
                    }

                    // Destroy the session and log out the user
                    req.session.destroy(err => {
                        if (err) {
                            console.error('Error destroying session:', err);
                        }
                        res.json({ success: true, message: 'Account deleted successfully' });
                    });
                });
            });
        });
    });
});
// Route to fetch user info
router.get('/get-user-info', checkSession, (req, res) => {
    const userId = req.session.user.id; // Assuming user ID is stored in session

    // Fetch the user data from the database (example using MySQL)
    const query = 'SELECT first_name, last_name, phone_number, ic_passport_number, email, license_number, username FROM users WHERE id = ?';
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user data:', err);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = results[0]; // Assuming only one result
        res.json({ success: true, user });
    });
});
async function hashPassword(password) {
    try {
        // Generate a salt with 10 rounds
        const salt = await bcrypt.genSalt(10);
        // Hash the password with the salt
        const hashedPassword = await bcrypt.hash(password, salt);
        return hashedPassword;
    } catch (error) {
        console.error('Error hashing password:', error);
        throw error;
    }
}

// Route to update user info
router.put('/update-user-info', checkSession, async (req, res) => {
    const userId = req.session.user.id; // Assuming user ID is stored in session
    const { first_name, last_name, phone_number, ic_passport_number, email, license_number, username, password } = req.body;

    // Hash the new password if provided
    let hashedPassword = undefined;
    if (password) {
        hashedPassword = await hashPassword(password);
    }

    // Update the user data in the database (example using MySQL)
    const query = `
        UPDATE users
        SET
            first_name = ?,
            last_name = ?,
            phone_number = ?,
            ic_passport_number = ?,
            email = ?,
            license_number = ?,
            username = ?,
            ${password ? 'password = ?,' : ''}
            updated_at = NOW()
        WHERE id = ?
    `;
    const values = [
        first_name,
        last_name,
        phone_number,
        ic_passport_number,
        email,
        license_number,
        username,
        ...(password ? [hashedPassword] : []),
        userId
    ];

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Error updating user data:', err);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: 'User information updated successfully' });
    });
});
router.get('/bookings', (req, res) => {
const query = "SELECT CONCAT(a.first_name, ' ', a.last_name) AS customer_name, CONCAT(c.make, ' ', c.model) AS car_name, b.* FROM bookings b LEFT JOIN users a ON a.id = b.user_id LEFT JOIN cars c ON c.car_id = b.car_id ORDER BY start_date DESC";
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching bookings:', err);
            return res.status(500).json({ error: 'Failed to retrieve bookings.' });
        }
        res.json(results);
    });
});
router.get('/bookings/:id', (req, res) => {
  const bookingId = req.params.id;
  const query = `
    SELECT 
      u.*, 
      CONCAT(u.first_name, ' ', u.last_name) AS customer_name, 
      CONCAT(c.make, ' ', c.model) AS car_name, 
      c.status as car_status,
      b.*
    FROM bookings b
    LEFT JOIN users u ON u.id = b.user_id
    LEFT JOIN cars c ON c.car_id = b.car_id
    WHERE b.booking_id = ?
  `;

  db.query(query, [bookingId], (error, results) => {
    if (error) {
      console.error('Error fetching booking details:', error);
      return res.status(500).json({ error: 'Failed to fetch booking details' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(results[0]);
  });
});


router.put('/bookings/:id/:status', checkSession, (req, res) => {
  const userId = req.session.user.id; // Assuming user ID is stored in session
  const status = req.params.status;
  const bookingId = parseInt(req.params.id, 10);

  if (isNaN(bookingId)) {
    return res.status(400).send('Invalid booking ID');
  }

  const updateBookingQuery = `UPDATE bookings SET status = ?, admin_id = ? WHERE booking_id = ?`;
  const updateCarQuery = `
    UPDATE cars c
    JOIN bookings b ON b.car_id = c.car_id
    SET c.status = 'rented'
    WHERE b.booking_id = ?`;

  db.beginTransaction((err) => {
    if (err) {
      console.error('Transaction error:', err);
      return res.status(500).json({ error: 'Failed to start transaction' });
    }

    db.query(updateBookingQuery, [status, userId, bookingId], (error, result) => {
      if (error) {
        return db.rollback(() => {
          console.error('Error updating booking status:', error);
          res.status(500).json({ error: 'Failed to update booking status' });
        });
      }

      if (result.affectedRows === 0) {
        return db.rollback(() => {
          res.status(404).json({ error: 'Booking not found' });
        });
      }

      db.query(updateCarQuery, [bookingId], (error, result) => {
        if (error) {
          return db.rollback(() => {
            console.error('Error updating car status:', error);
            res.status(500).json({ error: 'Failed to update car status' });
          });
        }

        db.commit((err) => {
          if (err) {
            return db.rollback(() => {
              console.error('Transaction commit error:', err);
              res.status(500).json({ error: 'Failed to commit transaction' });
            });
          }

          res.json({ success: true, message: `Booking ${status}` });
        });
      });
    });
  });
});


router.get('/adminnum', (req, res) => {
  const query = `
    SELECT count(id) as num from admin;
  `;

  db.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching booking details:', error);
      return res.status(500).json({ error: 'Failed to fetch booking details' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(results[0]);
  });
});
router.get('/contact-us', async (req, res) => {
  const query = `
    SELECT * from contact_us;
  `;

    db.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching bookings:', err);
            return res.status(500).json({ error: 'Failed to fetch bookings' });
        }

        res.json({ contacts: result });
    });
});

// Route to fetch all admins
router.get('/admins', (req, res) => {
  const query = 'SELECT * FROM admin';
  db.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching admins:', error);
      return res.status(500).json({ error: 'Failed to fetch admins' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'No admins found' });
    }

    res.json({ success: true, items: results });
  });
});

// Route to delete an admin by ID
router.delete('/admins/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM admin WHERE id = ?';

  db.query(query, [id], (error, results) => {
    if (error) {
      console.error('Error deleting admin:', error);
      return res.status(500).json({ error: 'Failed to delete admin' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json({ success: true, message: 'Admin deleted successfully' });
  });
});

// Route to fetch all users
router.get('/users', (req, res) => {
  const query = 'SELECT * FROM users';

  db.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'No users found' });
    }

    res.json({ success: true, items: results });
  });
});

// Route to delete a user by ID
router.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM users WHERE id = ?';

  db.query(query, [id], (error, results) => {
    if (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ error: 'Failed to delete user' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  });
});


router.get('/invoice/:booking_id', (req, res) => {
  const { booking_id } = req.params; // Extract booking_id from URL parameters
  const query = `
    SELECT 
      CONCAT(a.first_name, ' ', a.last_name) AS admin_name, 
      CONCAT(u.first_name, ' ', u.last_name) AS user_name,   
      CONCAT(c.make, ' ', c.model) AS car_name,
      c.daily_rate,
      b.start_date,
      b.end_date,
      b.total_price
    FROM bookings b
    LEFT JOIN admin a ON a.id = b.admin_id
    LEFT JOIN users u ON u.id = b.user_id
    LEFT JOIN cars c ON c.car_id = b.car_id
    WHERE b.booking_id = ?`;

  db.query(query, [booking_id], (err, result) => {
    if (err) {
      console.error('Error fetching bookings:', err);
      return res.status(500).json({ error: 'Failed to fetch bookings' });
    }

    res.json({ contacts: result });
  });
});

module.exports = router;
