const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

// Initialize express app
const app = express();
const PORT = 3000;

// Serve static files like CSS, JS, and images
app.use(express.static(path.join(__dirname, 'public'))); // Adjust folder name if necessary
app.use(express.static(path.join(__dirname, '/')));
app.use(express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Middleware to parse JSON bodies
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded data

// Session management middleware
app.use(session({
  secret: 'your_secret_key', // Use a more secure key in production
  resave: false,
  saveUninitialized: true,
}));

// Import API routes from api.js
const apiRoutes = require('./js/api.js');  // Ensure correct path to api.js

// Use the API routes for requests starting with /api
app.use('/api', apiRoutes);

// Custom route to serve contact.html (or any other HTML page in the root)
app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'contact.html')); // Serve the contact page
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html')); // Serve the contact page
});
app.get('/services', (req, res) => {
  res.sendFile(path.join(__dirname, 'services.html')); // Serve the contact page
});
app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'about.html')); // Serve the contact page
});
// Other server configuration
app.get('/car', (req, res) => {
  res.sendFile(path.join(__dirname, 'car.html'));
});
// Route to serve signup.html
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup.html'));
});
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});
app.get('/admindashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'admindashboard.html'));
});
app.get('/admincontact', (req, res) => {
  res.sendFile(path.join(__dirname, 'admincontact.html'));
});
app.get('/admincar', (req, res) => {
  res.sendFile(path.join(__dirname, 'admincar.html'));
});

app.get('/api/check-session', (req, res) => {
  if (req.session.user) {
    console.log("Session exists:", req.session.user);  // Log the session if it exists
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    console.log("No session found");
    res.json({ loggedIn: false });
  }
});

// Route for login (just a placeholder)
app.post('/login', (req, res) => {
  // Set session data here
  req.session.user = { username: 'example' };  // Example session
  console.log("Session set:", req.session.user);
  res.redirect('/login.html');
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to destroy session' });
    }
    console.log('Session destroyed');
    res.redirect('/');
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
