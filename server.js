const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const bcrypt = require('bcryptjs');

// Create an Express application
const app = express();
const server = http.createServer(app); // Create HTTP server using Express
const io = socketIo(server); // Initialize Socket.io with the server

// Express session setup
app.use(session({
  secret: 'your-secret-key', // Change this to a secure key
  resave: false,
  saveUninitialized: true
}));

// Middleware to parse incoming requests (form data)
app.use(express.urlencoded({ extended: true })); // Allows Express to parse form data (POST requests)

// Dummy admin credentials (for demonstration purposes)
const adminUser = {
  username: 'admin',
  password: '$2b$10$77eyrSIkGWs2L4HUCasZxeUzgzhijZXsTIWKDrHWMypA/NbaVdL9u' // bcrypt hash of 'password123'
};


// Middleware to check if the user is logged in
function isAuthenticated(req, res, next) {
  if (req.session.loggedIn) {
    return next();
  }
  res.redirect('/login');
}

// Serve static files (your HTML file, CSS, JS) from the "public" folder
app.use(express.static('public'));

// Handle new connections from clients (browsers)
let touristId = 0;

io.on('connection', (socket) => {
  console.log('A tourist connected');
  touristId++;

  // Send the unique tourist ID to the client
  socket.emit('tourist-id', touristId);

  // Listen for the tourist's location and broadcast it to all connected clients
  socket.on('send-location', (data) => {
    io.emit('tourist-location', { id: touristId, ...data });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('A tourist disconnected');
  });
});

// Route to serve the login page
app.get('/login', (req, res) => {
  res.send(`
    <form method="POST" action="/login">
      <input type="text" name="username" placeholder="Username" required />
      <input type="password" name="password" placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  `);
});

// Route to handle the login POST request
app.post('/login', (req, res) => {
  const { username, password } = req.body; // Destructure the username and password from the body
  
  if (username === adminUser.username) {
    bcrypt.compare(password, adminUser.password, (err, isMatch) => {
      if (isMatch) {
        req.session.loggedIn = true;
        res.redirect('/map');
      } else {
        res.send('Invalid credentials');
      }
    });
  } else {
    res.send('Invalid credentials');
  }
});

// Map route - accessible only for authenticated users
app.get('/map', isAuthenticated, (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Route to log out
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send('Error logging out');
    }
    res.redirect('/login');
  });
});

// Start the server on port 3000
server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
