// signup.js

const form = document.getElementById('signupForm');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!name || !email || !password) {
    alert('Please fill all fields');
    return;
  }

  try {
    const res = await fetch('http://localhost:4000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Signup failed');
      return;
    }

    // save token and go to main Habitify page (your index.html)
    localStorage.setItem('auth_token', data.token);
    // you can also store basic user info if needed
    localStorage.setItem('user_name', data.user.name);

    window.location.href = 'index.html'; // Habitify dashboard
  } catch (err) {
    console.error(err);
    alert('Network error during signup');
  }
});
