// login.js

const API_BASE = 'http://localhost:4000';

// small helper so other scripts can read token safely
function getAuthToken() {
  return localStorage.getItem('auth_token');
}

const form = document.getElementById('loginForm');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    alert('Please enter email and password');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Login failed');
      return;
    }

    // save token + name
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user_name', data.user.name);

    // OPTIONAL: check token before redirect
    const token = getAuthToken();
    if (!token) {
      alert('Could not store login token');
      return;
    }

    // go to Habitify main page
    window.location.href = 'index.html';
  } catch (err) {
    console.error(err);
    alert('Network error during login');
  }
});
