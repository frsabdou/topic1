require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } 
}));


app.use(express.static(path.join(__dirname, 'public')));


const USERS_FILE = path.join(__dirname, 'data', 'users.json');


if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}


if (!fs.existsSync(USERS_FILE)) {
  const initialUsers = {
    'fares': { password: 'fares11', Admin: false },
    'admin': { password: 'admin123', Admin: true },
  };
  fs.writeFileSync(USERS_FILE, JSON.stringify(initialUsers, null, 2));
}


function getUsers() {
  const data = fs.readFileSync(USERS_FILE, 'utf8');
  return JSON.parse(data);
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function addUser(username, password) {
  const users = getUsers();
  if (users[username]) {
    return false; 
  }
  users[username] = { password, Admin: false };
  saveUsers(users);
  return true;
}

function deleteUser(username) {
  const users = getUsers();
  if (!users[username]) {
    return false; 
  }
  delete users[username];
  saveUsers(users);
  return true;
}


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();
  
  if (users[username] && users[username].password === password) {
    
    req.session.user = username;
    
    
    res.cookie('Admin', users[username].Admin.toString());
    
    res.redirect('/account');
  } else {
    res.redirect('/login?error=Invalid credentials');
  }
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.redirect('/register?error=Username and password are required');
  }
  
  if (addUser(username, password)) {
    res.redirect('/login?message=Registration successful. Please log in.');
  } else {
    res.redirect('/register?error=Username already exists');
  }
});

app.get('/account', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'public', 'account.html'));
});

app.get('/admin', (req, res) => {
  
  if (!req.session.user) {
    return res.status(401).send('You must be logged in to access the admin panel');
  }
  
  
  const isAdmin = req.cookies.Admin === 'true';
  
  if (!isAdmin) {
    
    return res.status(403).send('Admin interface only available if logged in as an administrator');
  }
  
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/user-info', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const users = getUsers();
  const username = req.session.user;
  const isAdmin = req.cookies.Admin === 'true';
  
  res.json({
    username,
    isAdmin
  });
});

app.get('/api/users', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  
  const isAdmin = req.cookies.Admin === 'true';
  
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin interface only available if logged in as an administrator' });
  }
  
  const users = getUsers();
  const userList = Object.keys(users).map(username => ({
    username
  }));
  
  res.json({ users: userList });
});

app.post('/api/delete-user', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  
  const isAdmin = req.cookies.Admin === 'true';
  
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin interface only available if logged in as an administrator' });
  }
  
  const { username } = req.body;
  
  if (username === req.session.user) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  
  if (deleteUser(username)) {
    res.json({ success: true, message: `User ${username} deleted successfully` });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.clearCookie('Admin');
  res.redirect('/login');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});