document.addEventListener("DOMContentLoaded", function () {
  // Function to check if the user is logged in
  function checkSession() {
    return fetch('/api/check-session', {
      method: 'GET',
    })
      .then(response => response.json())
      .then(data => {
        return data.loggedIn;  // Return true if logged in, false otherwise
      })
      .catch(error => {
        console.error('Error checking session:', error);
        return false;
      });
  }

  // Handle signup form submission
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();

      // Collect form data using the 'id' attributes
      const formData = {
        first_name: document.getElementById('first-name').value,
        last_name: document.getElementById('last-name').value,
        phone_number: document.getElementById('phone-number').value,
        ic_passport_number: document.getElementById('ic-passport-number').value,
        email: document.getElementById('email').value,
        license_number: document.getElementById('license-number').value,
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
        confirm_password: document.getElementById('confirm-password').value,
      };

      // Check if passwords match
      if (formData.password !== formData.confirm_password) {
        alert('Passwords do not match!');
        return;
      }

      // Send the form data to the server (API)
      fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData), // Send form data as JSON
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Successfully signed up, now check if logged in
          checkSession().then(loggedIn => {
            if (loggedIn) {
              // Logged in after signup, redirect to home page
              window.location.href = '/index.html';
            } else {
              alert('Signup successful but session not created. Please log in.');
            }
          });
        } else {
          alert('Signup failed. Please try again.');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Error occurred during signup.');
      });
    });
  }

  // Handle login form submission
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault(); // Prevent the form from submitting normally

      // Collect form data
      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;

      // Determine the appropriate API endpoint based on the username
      const isAdmin = /^admin\d+$/.test(username);
      const apiEndpoint = isAdmin ? "/api/adminlogin" : "/api/login";

      // Send the login request to the appropriate API endpoint
      fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // Redirect to the appropriate dashboard
          const redirectUrl = isAdmin ? "/admindashboard" : "/index.html";
          window.location.href = redirectUrl;
        } else {
          // Show error message if login failed
          alert(data.error || "Invalid username or password.");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("An error occurred. Please try again.");
      });
    });
  }

const adminsignupForm = document.getElementById('admin-signup-form');
if (adminsignupForm) {
  adminsignupForm.addEventListener('submit', function (e) {
    e.preventDefault();

    // Create an async function for admin name fetching
    async function adminname() {
      try {
        const response = await fetch('/api/adminnum');
        const data = await response.json();
        return 'admin' + data.num;
      } catch (error) {
        console.error('Error fetching admin number:', error);
        return null; // Return null in case of an error
      }
    }

    // Make sure to await the async function result
    async function handleSignup() {
      const userName = await adminname(); // Await the username
      if (!userName) {
        alert("Username couldn't be generated.");
        return;
      }

      // Collect form data
      const formData = {
        first_name: document.getElementById('first-name').value,
        last_name: document.getElementById('last-name').value,
        phone_number: document.getElementById('phone-number').value,
        ic_passport_number: document.getElementById('ic-passport-number').value,
        email: document.getElementById('email').value,
        license_number: document.getElementById('license-number').value,
        username: userName,
        password: document.getElementById('password').value,
        confirm_password: document.getElementById('confirm-password').value,
      };

      // Check if passwords match
      if (formData.password !== formData.confirm_password) {
        alert('Passwords do not match!');
        return;
      }

      // Send the form data to the server (API)
      try {
        const response = await fetch('/api/adminsignup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData), // Send form data as JSON
        });
        const data = await response.json();

        if (data.success) {
          // Successfully signed up, now check if logged in
          checkSession().then(loggedIn => {
            if (loggedIn) {
              // Logged in after signup, redirect to home page
              window.location.href = '/admindashboard';
            } else {
              alert('Signup successful but session not created. Please log in.');
            }
          });
        } else {
          alert('Signup failed. Please try again.');
        }
      } catch (error) {
        console.error('Error during signup:', error);
        alert('Error occurred during signup.');
      }
    }

    handleSignup(); 
  });
}

});

// Function to check if the user is logged in by querying the session status
function checkLoginStatus() {
  fetch('/api/check-session')
    .then(response => response.json())
    .then(data => {
      const loginLogoutText = document.getElementById('loginLogoutText');
      const loginLogoutLink = document.getElementById('loginLogoutLink');
      if (data.loggedIn) {
        loginLogoutLink.innerText = 'Logout';  // Change link text to 'Logout'
        loginLogoutLink.href = '/logout'; // Set the logout link
        
        // Unhide the dashboard link by setting its display style to block
        const dashboardLink = document.getElementById('dashboardtext');
        dashboardLink.style.display = 'block'; // Make it visible
      } else {
        loginLogoutLink.innerText = 'Login';  // Change link text to 'Login'
        loginLogoutLink.href = 'login.html'; // Set the login link
        
        // Hide the dashboard link by setting its display style to none
        const dashboardLink = document.getElementById('dashboardtext');
        dashboardLink.style.display = 'none'; // Hide it
      }
    })
    .catch(error => {
      console.error('Error checking login status:', error);
    });
}

// Run the checkLoginStatus function once the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
  checkLoginStatus();
});


// helper.js

// Function to load car data and display it in the grid
function loadCarData(containerId) {
  fetch('/api/cars')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(cars => {
      const carGrid = document.getElementById('car-grid');
      carGrid.innerHTML = '';  // Clear grid before appending new items

      // Check if there are cars in the response
      if (!cars || cars.length === 0) {
        carGrid.innerHTML = '<p>No cars available.</p>';
        return;
      }

      // Loop through the cars data and create car items
      cars.forEach(car => {
        const imgPath = car.img_path && car.img_path.trim() !== '' 
          ? car.img_path
          : '/images/car/default.jpg';  // Fallback if img_path is missing

        // Log image path to the console
        console.log('Car Image Path:', imgPath);

        const colDiv = document.createElement('div');
        colDiv.classList.add('col-md-4');
        colDiv.innerHTML = `
          <div class="car-wrap rounded ftco-animate">
            <div class="img rounded d-flex align-items-end" style="background-image: url('${imgPath}'); height: 200px; background-size: cover; background-position: center;">
            </div>
            <div class="text">
              <h2 class="mb-0"><a href="car-single.html">${car.make} ${car.model}</a></h2>
              <div class="d-flex mb-3">
                <span class="cat">${car.make}</span>
                <p class="price ml-auto">$${parseFloat(car.daily_rate).toFixed(2)} <span>/day</span></p>
              </div>
              <p class="d-flex mb-0 d-block">
                <a href="#" class="btn btn-primary py-2 mr-1">Book now</a>
                <a href="car-single.html" class="btn btn-secondary py-2 ml-1">Details</a>
              </p>
            </div>
          </div>
        `;
        carGrid.appendChild(colDiv);
      });
    })
    .catch(error => {
      console.error('Error fetching car data:', error);
      const carGrid = document.getElementById('car-grid');
      carGrid.innerHTML = '<p>Failed to load car data. Please try again later.</p>';
    });
}

// helper.js

function submitForm(event) {
  event.preventDefault(); // Prevent the default form submission
  
  // Get form data
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const subject = document.getElementById('subject').value;
  const message = document.getElementById('message').value;

  // Validate form fields
  if (!name || !email || !subject || !message) {
    alert('All fields are required.');
    return;
  }

  // Create data object to send
  const formData = {
    name: name,
    email: email,
    subject: subject,
    message: message
  };

  // Send POST request to API
  fetch('/api/submit-form', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData)
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      alert(data.error); // Show error if any
    } else {
      alert(data.message); // Show success message
      // Optionally, reset the form after submission
      document.querySelector('.contact-form').reset();
    }
  })
  .catch(error => {
    console.error('Error submitting form:', error);
    alert('An error occurred while submitting the form.');
  });
}

// Attach the function to the form submit event
document.querySelector('.contact-form').addEventListener('submit', submitForm);

