const API_BASE_URL = 'http://localhost:3001/api';

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.includes('login.html')) {
        setupLoginForm();
    } else if (path.includes('register.html')) {
        setupRegisterForm();
    } else if (path.includes('index.html')) {
        checkAuthAndRenderDashboard();
    }

    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'landing.html';
        });
    }

    // Logic for landing page animations
    if (path.includes('landing.html') || path === '/') {
        const aboutSection = document.getElementById('about');
        const aboutLink = document.querySelector('a[href="#about"]');

        if (aboutLink) {
            aboutLink.addEventListener('click', function (e) {
                e.preventDefault();
                aboutSection.scrollIntoView({ behavior: 'smooth' });
            });
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('about-section-visible');
                    entry.target.classList.remove('about-section-hidden');
                }
            });
        }, { threshold: 0.1 });

        if (aboutSection) {
            observer.observe(aboutSection);
        }

        // Preloader transition for navigation
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link:not([href="#about"])');
        const preloader = document.getElementById('preloader');

        navLinks.forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                const destination = this.href;

                if (preloader) {
                    preloader.style.display = 'flex';
                    // Wait for animation to be visible before navigating
                    setTimeout(() => {
                        window.location.href = destination;
                    }, 1500); // 1.5 seconds, matching the preloader fade-out animation
                }
            });
        });
    }
});

async function makeApiRequest(url, method, data = null) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers,
    };
    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Something went wrong');
        }
        return result;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const messageElement = document.getElementById('message');
    const loginTitle = document.getElementById('loginTitle');

    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');

    if (role && loginTitle) {
        loginTitle.textContent = `${role} Login`;
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const username = loginForm.username.value;
            const password = loginForm.password.value;

            try {
                const data = await makeApiRequest(`${API_BASE_URL}/auth/login`, 'POST', { username, password });
                localStorage.setItem('token', data.token);
                localStorage.setItem('userRole', data.user.role);
                localStorage.setItem('username', data.user.username);
                window.location.href = 'index.html';
            } catch (error) {
                messageElement.textContent = error.message;
            }
        });
    }
}

function setupRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    const messageElement = document.getElementById('message');

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const username = registerForm.username.value;
            const password = registerForm.password.value;
            const email = registerForm.email.value;
            const role = registerForm.role.value;

            try {
                const data = await makeApiRequest(`${API_BASE_URL}/auth/register`, 'POST', { username, password, email, role });
                localStorage.setItem('token', data.token);
                localStorage.setItem('userRole', data.user.role);
                localStorage.setItem('username', data.user.username);
                window.location.href = 'index.html';
            } catch (error) {
                messageElement.textContent = error.message;
            }
        });
    }
}

function checkAuthAndRenderDashboard() {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    const appDiv = document.getElementById('app');
    const preloader = document.getElementById('preloader');
    const navbar = document.querySelector('.navbar');
    const dashboardContainer = document.querySelector('.dashboard-container');

    if (!token || !userRole) {
        window.location.href = 'landing.html';
        return;
    }

    // Hide dashboard and navbar initially
    if(navbar) navbar.style.display = 'none';
    if(dashboardContainer) dashboardContainer.style.display = 'none';

    // Show preloader
    if(preloader) preloader.style.display = 'flex';

    // After animation (2 seconds), hide preloader and show dashboard
    setTimeout(() => {
        if(preloader) preloader.style.display = 'none';
        if(navbar) navbar.style.display = 'flex';
        if(dashboardContainer) dashboardContainer.style.display = 'flex';

        renderDashboard(userRole, appDiv);
    }, 2000); // Total animation time
}

async function updateNotificationBadge() {
    const viewNotificationsBtn = document.getElementById('viewNotifications');
    if (!viewNotificationsBtn) return;

    try {
        const notifications = await makeApiRequest(`${API_BASE_URL}/notifications`, 'GET');
        const unreadCount = notifications.filter(n => !n.is_read).length;
        
        viewNotificationsBtn.classList.remove('btn-warning');
        viewNotificationsBtn.classList.add('btn-info');
        viewNotificationsBtn.innerHTML = 'View Notifications';

        if (unreadCount > 0) {
            viewNotificationsBtn.classList.remove('btn-info');
            viewNotificationsBtn.classList.add('btn-warning');
            viewNotificationsBtn.innerHTML = `View Notifications <span class="badge bg-danger ms-2">${unreadCount}</span>`;
        }
    } catch (error) {
        console.error('Failed to fetch notifications for badge:', error);
    }
}

function renderDashboard(role, appDiv) {
    document.body.className = ''; // Clear previous background classes

    let welcomeMessage, title, description, buttons;
    const username = localStorage.getItem('username');

    if (role === 'Patient') {
        document.body.classList.add('hospital-bg');
        welcomeMessage = `Welcome, ${username}!`;
        title = "Patient Dashboard";
        description = "View your appointments, book new ones, and check notifications.";
        buttons = `
            <button id="viewAppointments" class="btn btn-primary">View My Appointments</button>
            <button id="bookAppointment" class="btn btn-success">Book New Appointment</button>
            <button id="viewNotifications" class="btn btn-info">View Notifications</button>
        `;
    } else if (role === 'Doctor') {
        document.body.classList.add('doctor-bg'); // This class needs to be created
        welcomeMessage = `Welcome, Dr. ${username}!`;
        title = "Doctor Dashboard";
        description = "Manage your appointments and view patient records.";
        buttons = `
            <button id="viewDoctorAppointments" class="btn btn-primary">View My Appointments</button>
            <button id="viewPatientRecords" class="btn btn-success">View Patient Records</button>
        `;
    } else if (role === 'Admin') {
        document.body.classList.add('hospital-bg');
        welcomeMessage = `Welcome, Admin ${username}!`;
        title = "Admin Dashboard";
        description = "Manage users, appointments, and resources.";
        buttons = `
            <button id="manageUsers" class="btn btn-primary">Manage Users</button>
            <button id="manageAppointments" class="btn btn-success">Manage All Appointments</button>
            <button id="manageResources" class="btn btn-info">Manage Resources</button>
        `;
    }

    const dashboardContent = `
        <h2 class="welcome-msg">${welcomeMessage}</h2>
        <h1 class="mb-3">${title}</h1>
        <p class="description mb-4">${description}</p>
        <div class="d-grid gap-2 col-10 mx-auto">
            ${buttons}
        </div>
    `;

    appDiv.innerHTML = dashboardContent;

    // Add event listeners
    if (role === 'Patient') {
        document.getElementById('viewAppointments').addEventListener('click', () => viewPatientAppointments(appDiv));
        document.getElementById('bookAppointment').addEventListener('click', () => bookNewAppointment(appDiv));
        document.getElementById('viewNotifications').addEventListener('click', () => viewNotifications(appDiv));
    } else if (role === 'Doctor') {
        document.getElementById('viewDoctorAppointments').addEventListener('click', () => viewDoctorAppointments(appDiv));
        document.getElementById('viewPatientRecords').addEventListener('click', () => viewPatientRecords(appDiv));
    } else if (role === 'Admin') {
        document.getElementById('manageUsers').addEventListener('click', () => manageUsers(appDiv));
        document.getElementById('manageAppointments').addEventListener('click', () => manageAllAppointments(appDiv));
        document.getElementById('manageResources').addEventListener('click', () => manageResources(appDiv));
    }
}

async function viewPatientAppointments(appDiv) {
    appDiv.innerHTML = '<h2 class="text-center mb-3">My Appointments</h2>';
    const messageElement = document.createElement('p');
    messageElement.className = 'text-center';
    appDiv.appendChild(messageElement);

    try {
        const appointments = await makeApiRequest(`${API_BASE_URL}/appointments`, 'GET');
        if (appointments.length === 0) {
            messageElement.textContent = 'No appointments found.';
        } else {
            const tableHtml = `
                <table class="table table-striped table-bordered">
                    <thead>
                        <tr>
                            <th>Doctor ID</th>
                            <th>Date & Time</th>
                            <th>Description</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${appointments.map(app => `
                            <tr>
                                <td>${app.doctor_id}</td>
                                <td>${new Date(app.appointment_date).toLocaleString()}</td>
                                <td>${app.description}</td>
                                <td><span class="badge bg-${app.status === 'Pending' ? 'warning' : app.status === 'Confirmed' ? 'success' : 'danger'}">${app.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            const tableDiv = document.createElement('div');
            tableDiv.innerHTML = tableHtml;
            appDiv.appendChild(tableDiv);
        }
    } catch (error) {
        messageElement.textContent = `Error fetching appointments: ${error.message}`;
    }

    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Dashboard';
    backButton.className = 'btn btn-secondary mt-3';
    backButton.addEventListener('click', () => checkAuthAndRenderDashboard());
    appDiv.appendChild(backButton);
}

async function viewDoctorAppointments(appDiv) {
    appDiv.innerHTML = '<h2 class="text-center mb-3">My Appointments</h2>';
    const messageElement = document.createElement('p');
    messageElement.className = 'text-center';
    appDiv.appendChild(messageElement);

    try {
        const appointments = await makeApiRequest(`${API_BASE_URL}/appointments`, 'GET');
        if (appointments.length === 0) {
            messageElement.textContent = 'No appointments found.';
            return;
        }

        const tableHtml = `
            <table class="table table-striped table-bordered">
                <thead>
                    <tr>
                        <th>Patient ID</th>
                        <th>Date & Time</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${appointments.map(app => `
                        <tr>
                            <td>${app.patient_id}</td>
                            <td>${new Date(app.appointment_date).toLocaleString()}</td>
                            <td>${app.description}</td>
                            <td>
                                <select class="form-select form-select-sm status-select" data-id="${app.id}">
                                    <option value="${app.status}" selected>${app.status}</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Cancelled">Cancelled</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Pending">Pending</option>
                                </select>
                            </td>
                            <td>
                                <button class="btn btn-sm btn-success update-status-btn" data-id="${app.id}">Update</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        const tableDiv = document.createElement('div');
        tableDiv.innerHTML = tableHtml;
        appDiv.appendChild(tableDiv);

        document.querySelectorAll('.update-status-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const appointmentId = event.target.dataset.id;
                const statusSelect = document.querySelector(`.status-select[data-id="${appointmentId}"]`);
                const newStatus = statusSelect.value;

                try {
                    const currentAppointments = await makeApiRequest(`${API_BASE_URL}/appointments`, 'GET');
                    const currentApp = currentAppointments.find(a => a.id == appointmentId);

                    if (currentApp) {
                        await makeApiRequest(`${API_BASE_URL}/appointments/${appointmentId}`, 'PUT', {
                            doctorId: currentApp.doctor_id,
                            date: new Date(currentApp.appointment_date).toISOString(),
                            description: currentApp.description,
                            status: newStatus
                        });
                        messageElement.textContent = 'Appointment status updated successfully!';
                        messageElement.className = 'text-success text-center';
                    } else {
                        messageElement.textContent = 'Appointment not found for update.';
                        messageElement.className = 'text-danger text-center';
                    }
                } catch (error) {
                    messageElement.textContent = `Error updating status: ${error.message}`;
                    messageElement.className = 'text-danger text-center';
                }
            });
        });

    } catch (error) {
        messageElement.textContent = `Error fetching appointments: ${error.message}`;
    }

    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Dashboard';
    backButton.className = 'btn btn-secondary mt-3';
    backButton.addEventListener('click', () => checkAuthAndRenderDashboard());
    appDiv.appendChild(backButton);
}

async function bookNewAppointment(appDiv) {
    appDiv.innerHTML = '<h2 class="text-center mb-3">Book New Appointment</h2>';
    const messageElement = document.createElement('p');
    messageElement.className = 'text-center';
    appDiv.appendChild(messageElement);

    let doctors = [];
    try {
        doctors = await makeApiRequest(`${API_BASE_URL}/auth/doctors`, 'GET');
    } catch (error) {
        messageElement.textContent = `Error fetching doctors: ${error.message}`;
        return;
    }

    const formHtml = `
        <form id="bookAppointmentForm" class="needs-validation" novalidate>
            <div class="mb-3">
                <label for="doctorId" class="form-label">Doctor:</label>
                <select class="form-select" id="doctorId" name="doctorId" required>
                    <option value="">Select a Doctor</option>
                    ${doctors.map(doctor => `<option value="${doctor.id}">${doctor.username}</option>`).join('')}
                </select>
                <div class="invalid-feedback">Please select a Doctor.</div>
            </div>
            <div class="mb-3">
                <label for="appointmentDate" class="form-label">Date & Time:</label>
                <input type="datetime-local" class="form-control" id="appointmentDate" name="appointmentDate" required>
                <div class="invalid-feedback">Please provide a date and time.</div>
            </div>
            <div class="mb-3">
                <label for="description" class="form-label">Description:</label>
                <textarea class="form-control" id="description" name="description"></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Book Appointment</button>
        </form>
    `;
    const formDiv = document.createElement('div');
    formDiv.innerHTML = formHtml;
    appDiv.appendChild(formDiv);

    const bookAppointmentForm = document.getElementById('bookAppointmentForm');
    bookAppointmentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!bookAppointmentForm.checkValidity()) {
            event.stopPropagation();
            bookAppointmentForm.classList.add('was-validated');
            return;
        }

        const doctorId = bookAppointmentForm.doctorId.value;
        const date = new Date(bookAppointmentForm.appointmentDate.value).toISOString();
        const description = bookAppointmentForm.description.value;

        try {
            await makeApiRequest(`${API_BASE_URL}/appointments`, 'POST', { doctorId, date, description });
            messageElement.className = 'text-success text-center';
            messageElement.textContent = 'Appointment booked successfully!';
            bookAppointmentForm.reset();
            bookAppointmentForm.classList.remove('was-validated');
        } catch (error) {
            if (error.message.includes('too close to another')) {
                alert('Booking failed: This time slot is too close to another one of your appointments. Please allow for a 30-minute grace period.');
            } else {
                messageElement.className = 'text-danger text-center';
                messageElement.textContent = `Error booking appointment: ${error.message}`;
            }
        }
    });

    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Dashboard';
    backButton.className = 'btn btn-secondary mt-3';
    backButton.addEventListener('click', () => checkAuthAndRenderDashboard());
    appDiv.appendChild(backButton);
}

async function manageUsers(appDiv) {
    appDiv.innerHTML = '<h2 class="text-center mb-3">Manage Users</h2>';
    const messageElement = document.createElement('p');
    messageElement.className = 'text-center';
    appDiv.appendChild(messageElement);

    try {
        const users = await makeApiRequest(`${API_BASE_URL}/auth/users`, 'GET');
        if (users.length === 0) {
            messageElement.textContent = 'No users found.';
        }

        const tableHtml = `
            <table class="table table-striped table-bordered">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.id}</td>
                            <td>
                                <input type="text" class="form-control form-control-sm" value="${user.username}" data-id="${user.id}" data-field="username">
                            </td>
                            <td>
                                <select class="form-select form-select-sm user-role-select" data-id="${user.id}">
                                    <option value="${user.role}" selected>${user.role}</option>
                                    <option value="Patient">Patient</option>
                                    <option value="Doctor">Doctor</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </td>
                            <td>
                                <button class="btn btn-sm btn-warning update-user-btn" data-id="${user.id}">Update</button>
                                <button class="btn btn-sm btn-danger delete-user-btn" data-id="${user.id}">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        const tableDiv = document.createElement('div');
        tableDiv.innerHTML = tableHtml;
        appDiv.appendChild(tableDiv);

        // Add event listeners for update and delete
        document.querySelectorAll('.update-user-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const userId = event.target.dataset.id;
                const usernameInput = document.querySelector(`input[data-id="${userId}"][data-field="username"]`);
                const roleSelect = document.querySelector(`.user-role-select[data-id="${userId}"]`);
                const newUsername = usernameInput.value;
                const newRole = roleSelect.value;

                try {
                    await makeApiRequest(`${API_BASE_URL}/auth/users/${userId}`, 'PUT', { username: newUsername, role: newRole });
                    messageElement.textContent = 'User role updated successfully!';
                    messageElement.className = 'text-success text-center';
                } catch (error) {
                    messageElement.textContent = `Error updating user: ${error.message}`;
                    messageElement.className = 'text-danger text-center';
                }
            });
        });

        document.querySelectorAll('.delete-user-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const userId = event.target.dataset.id;
                if (confirm('Are you sure you want to delete this user?')) {
                    try {
                        await makeApiRequest(`${API_BASE_URL}/auth/users/${userId}`, 'DELETE');
                        messageElement.textContent = 'User deleted successfully!';
                        messageElement.className = 'text-success text-center';
                        // Refresh user list
                        manageUsers(appDiv);
                    } catch (error) {
                        messageElement.textContent = `Error deleting user: ${error.message}`;
                        messageElement.className = 'text-danger text-center';
                    }
                }
            });
        });

        // Add form for creating new user
        const createUserFormHtml = `
            <h3 class="mt-5 text-center">Create New User</h3>
            <form id="createUserForm" class="needs-validation" novalidate>
                <div class="mb-3">
                    <label for="newUsername" class="form-label">Username:</label>
                    <input type="text" class="form-control" id="newUsername" name="username" required>
                    <div class="invalid-feedback">Please provide a username.</div>
                </div>
                <div class="mb-3">
                    <label for="newPassword" class="form-label">Password:</label>
                    <input type="password" class="form-control" id="newPassword" name="password" required>
                    <div class="invalid-feedback">Please provide a password.</div>
                </div>
                <div class="mb-3">
                    <label for="newRole" class="form-label">Role:</label>
                    <select class="form-select" id="newRole" name="role" required>
                        <option value="">Select Role</option>
                        <option value="Patient">Patient</option>
                        <option value="Doctor">Doctor</option>
                        <option value="Admin">Admin</option>
                    </select>
                    <div class="invalid-feedback">Please select a role.</div>
                </div>
                <button type="submit" class="btn btn-primary">Create User</button>
            </form>
        `;
        const createUserFormDiv = document.createElement('div');
        createUserFormDiv.innerHTML = createUserFormHtml;
        appDiv.appendChild(createUserFormDiv);

        const createUserForm = document.getElementById('createUserForm');
        createUserForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!createUserForm.checkValidity()) {
                event.stopPropagation();
                createUserForm.classList.add('was-validated');
                return;
            }

            const username = createUserForm.newUsername.value;
            const password = createUserForm.newPassword.value;
            const role = createUserForm.newRole.value;

            try {
                await makeApiRequest(`${API_BASE_URL}/auth/users`, 'POST', { username, password, role });
                messageElement.textContent = 'User created successfully!';
                messageElement.className = 'text-success text-center';
                createUserForm.reset();
                createUserForm.classList.remove('was-validated');
                // Refresh user list
                manageUsers(appDiv);
            } catch (error) {
                messageElement.textContent = `Error creating user: ${error.message}`;
                messageElement.className = 'text-danger text-center';
            }
        });

    } catch (error) {
        messageElement.textContent = `Error fetching users: ${error.message}`;
    }

    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Dashboard';
    backButton.className = 'btn btn-secondary mt-3';
    backButton.addEventListener('click', () => checkAuthAndRenderDashboard());
    appDiv.appendChild(backButton);
}

async function manageAllAppointments(appDiv) {
    appDiv.innerHTML = '<h2 class="text-center mb-3">Manage All Appointments</h2>';
    const messageElement = document.createElement('p');
    messageElement.className = 'text-center';
    appDiv.appendChild(messageElement);

    try {
        const appointments = await makeApiRequest(`${API_BASE_URL}/appointments`, 'GET');
        if (appointments.length === 0) {
            messageElement.textContent = 'No appointments found.';
            return;
        }

        const tableHtml = `
            <table class="table table-striped table-bordered">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Patient ID</th>
                        <th>Doctor ID</th>
                        <th>Date & Time</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${appointments.map(app => `
                        <tr>
                            <td>${app.id}</td>
                            <td>${app.patient_id}</td>
                            <td>${app.doctor_id}</td>
                            <td>${new Date(app.appointment_date).toLocaleString()}</td>
                            <td>
                                <input type="text" class="form-control form-control-sm" value="${app.description}" data-id="${app.id}" data-field="description">
                            </td>
                            <td>
                                <select class="form-select form-select-sm status-select" data-id="${app.id}">
                                    <option value="${app.status}" selected>${app.status}</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Cancelled">Cancelled</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Pending">Pending</option>
                                </select>
                            </td>
                            <td>
                                <button class="btn btn-sm btn-warning update-appointment-btn" data-id="${app.id}">Update</button>
                                <button class="btn btn-sm btn-danger delete-appointment-btn" data-id="${app.id}">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        const tableDiv = document.createElement('div');
        tableDiv.innerHTML = tableHtml;
        appDiv.appendChild(tableDiv);

        // Add event listeners for update and delete
        document.querySelectorAll('.update-appointment-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const appointmentId = event.target.dataset.id;
                const descriptionInput = document.querySelector(`input[data-id="${appointmentId}"][data-field="description"]`);
                const statusSelect = document.querySelector(`.status-select[data-id="${appointmentId}"]`);
                const newDescription = descriptionInput.value;
                const newStatus = statusSelect.value;

                try {
                    // Fetch current appointment details to send with update
                    const currentAppointments = await makeApiRequest(`${API_BASE_URL}/appointments`, 'GET');
                    const currentApp = currentAppointments.find(a => a.id == appointmentId);

                    if (currentApp) {
                        await makeApiRequest(`${API_BASE_URL}/appointments/${appointmentId}`, 'PUT', {
                            doctorId: currentApp.doctor_id,
                            date: formatDateTimeForMySQL(currentApp.appointment_date), // FORMAT DATE HERE
                            description: newDescription,
                            status: newStatus
                        });
                        messageElement.textContent = 'Appointment updated successfully!';
                        messageElement.className = 'text-success text-center';
                    } else {
                        messageElement.textContent = 'Appointment not found for update.';
                        messageElement.className = 'text-danger text-center';
                    }
                } catch (error) {
                    messageElement.textContent = `Error updating appointment: ${error.message}`;
                    messageElement.className = 'text-danger text-center';
                }
            });
        });

        document.querySelectorAll('.delete-appointment-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const appointmentId = event.target.dataset.id;
                if (confirm('Are you sure you want to delete this appointment?')) {
                    try {
                        await makeApiRequest(`${API_BASE_URL}/appointments/${appointmentId}`, 'DELETE');
                        messageElement.textContent = 'Appointment deleted successfully!';
                        messageElement.className = 'text-success text-center';
                        // Refresh appointment list
                        manageAllAppointments(appDiv);
                    } catch (error) {
                        messageElement.textContent = `Error deleting appointment: ${error.message}`;
                        messageElement.className = 'text-danger text-center';
                    }
                }
            });
        });

    } catch (error) {
        messageElement.textContent = `Error fetching appointments: ${error.message}`;
    }

    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Dashboard';
    backButton.className = 'btn btn-secondary mt-3';
    backButton.addEventListener('click', () => checkAuthAndRenderDashboard());
    appDiv.appendChild(backButton);
}

async function manageResources(appDiv) {
    appDiv.innerHTML = '<h2 class="text-center mb-3">Manage Resources</h2>';
    const messageElement = document.createElement('p');
    messageElement.className = 'text-center';
    appDiv.appendChild(messageElement);

    try {
        const resources = await makeApiRequest(`${API_BASE_URL}/resources`, 'GET');
        if (resources.length === 0) {
            messageElement.textContent = 'No resources found.';
        }

        const tableHtml = `
            <table class="table table-striped table-bordered">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Available</th>
                        <th>Quantity</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${resources.map(resource => `
                        <tr>
                            <td>${resource.id}</td>
                            <td>
                                <input type="text" class="form-control form-control-sm" value="${resource.name}" data-id="${resource.id}" data-field="name">
                            </td>
                            <td>
                                <select class="form-select form-select-sm resource-type-select" data-id="${resource.id}">
                                    <option value="${resource.type}" selected>${resource.type}</option>
                                    <option value="bed">bed</option>
                                    <option value="medicine">medicine</option>
                                    <option value="equipment">equipment</option>
                                </select>
                            </td>
                            <td>
                                ${resource.type === 'bed' || resource.type === 'equipment' ? 
                                    `<input type="checkbox" class="form-check-input" ${resource.isAvailable ? 'checked' : ''} data-id="${resource.id}" data-field="isAvailable">` : 'N/A'}
                            </td>
                            <td>
                                ${resource.type === 'medicine' ? 
                                    `<input type="number" class="form-control form-control-sm" value="${resource.quantity}" data-id="${resource.id}" data-field="quantity">` : 'N/A'}
                            </td>
                            <td>
                                <button class="btn btn-sm btn-warning update-resource-btn" data-id="${resource.id}">Update</button>
                                <button class="btn btn-sm btn-danger delete-resource-btn" data-id="${resource.id}">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        const tableDiv = document.createElement('div');
        tableDiv.innerHTML = tableHtml;
        appDiv.appendChild(tableDiv);

        // Add event listeners for update and delete
        document.querySelectorAll('.update-resource-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const resourceId = event.target.dataset.id;
                const nameInput = document.querySelector(`input[data-id="${resourceId}"][data-field="name"]`);
                const typeSelect = document.querySelector(`.resource-type-select[data-id="${resourceId}"]`);
                const isAvailableInput = document.querySelector(`input[data-id="${resourceId}"][data-field="isAvailable"]`);
                const quantityInput = document.querySelector(`input[data-id="${resourceId}"][data-field="quantity"]`);

                const newName = nameInput.value;
                const newType = typeSelect.value;
                const newIsAvailable = isAvailableInput ? isAvailableInput.checked : undefined;
                const newQuantity = quantityInput ? parseInt(quantityInput.value) : undefined;

                try {
                    await makeApiRequest(`${API_BASE_URL}/resources/${resourceId}`, 'PUT', {
                        name: newName,
                        type: newType,
                        isAvailable: newIsAvailable,
                        quantity: newQuantity
                    });
                    messageElement.textContent = 'Resource updated successfully!';
                    messageElement.className = 'text-success text-center';
                } catch (error) {
                    messageElement.textContent = `Error updating resource: ${error.message}`;
                    messageElement.className = 'text-danger text-center';
                }
            });
        });

        document.querySelectorAll('.delete-resource-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const resourceId = event.target.dataset.id;
                if (confirm('Are you sure you want to delete this resource?')) {
                    try {
                        await makeApiRequest(`${API_BASE_URL}/resources/${resourceId}`, 'DELETE');
                        messageElement.textContent = 'Resource deleted successfully!';
                        messageElement.className = 'text-success text-center';
                        // Refresh resource list
                        manageResources(appDiv);
                    } catch (error) {
                        messageElement.textContent = `Error deleting resource: ${error.message}`;
                        messageElement.className = 'text-danger text-center';
                    }
                }
            });
        });

        // Add form for creating new resource
        const createResourceFormHtml = `
            <h3 class="mt-5 text-center">Create New Resource</h3>
            <form id="createResourceForm" class="needs-validation" novalidate>
                <div class="mb-3">
                    <label for="newResourceName" class="form-label">Name:</label>
                    <input type="text" class="form-control" id="newResourceName" name="name" required>
                    <div class="invalid-feedback">Please provide a name.</div>
                </div>
                <div class="mb-3">
                    <label for="newResourceType" class="form-label">Type:</label>
                    <select class="form-select" id="newResourceType" name="type" required>
                        <option value="">Select Type</option>
                        <option value="bed">bed</option>
                        <option value="medicine">medicine</option>
                        <option value="equipment">equipment</option>
                    </select>
                    <div class="invalid-feedback">Please select a type.</div>
                </div>
                <div class="mb-3 form-check" id="newResourceIsAvailableDiv" style="display: none;">
                    <input type="checkbox" class="form-check-input" id="newResourceIsAvailable" name="isAvailable">
                    <label class="form-check-label" for="newResourceIsAvailable">Is Available</label>
                </div>
                <div class="mb-3" id="newResourceQuantityDiv" style="display: none;">
                    <label for="newResourceQuantity" class="form-label">Quantity:</label>
                    <input type="number" class="form-control" id="newResourceQuantity" name="quantity">
                </div>
                <button type="submit" class="btn btn-primary">Create Resource</button>
            </form>
        `;
        const createResourceFormDiv = document.createElement('div');
        createResourceFormDiv.innerHTML = createResourceFormHtml;
        appDiv.appendChild(createResourceFormDiv);

        const createResourceForm = document.getElementById('createResourceForm');
        const newResourceTypeSelect = document.getElementById('newResourceType');
        const newResourceIsAvailableDiv = document.getElementById('newResourceIsAvailableDiv');
        const newResourceQuantityDiv = document.getElementById('newResourceQuantityDiv');

        newResourceTypeSelect.addEventListener('change', () => {
            newResourceIsAvailableDiv.style.display = 'none';
            newResourceQuantityDiv.style.display = 'none';
            if (newResourceTypeSelect.value === 'bed' || newResourceTypeSelect.value === 'equipment') {
                newResourceIsAvailableDiv.style.display = 'block';
            } else if (newResourceTypeSelect.value === 'medicine') {
                newResourceQuantityDiv.style.display = 'block';
            }
        });

        createResourceForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!createResourceForm.checkValidity()) {
                event.stopPropagation();
                createResourceForm.classList.add('was-validated');
                return;
            }

            const name = createResourceForm.newResourceName.value;
            const type = newResourceTypeSelect.value;
            const isAvailable = document.getElementById('newResourceIsAvailable').checked;
            const quantity = parseInt(document.getElementById('newResourceQuantity').value);

            try {
                await makeApiRequest(`${API_BASE_URL}/resources`, 'POST', { name, type, isAvailable, quantity });
                messageElement.textContent = 'Resource created successfully!';
                messageElement.className = 'text-success text-center';
                createResourceForm.reset();
                createResourceForm.classList.remove('was-validated');
                // Refresh resource list
                manageResources(appDiv);
            } catch (error) {
                messageElement.textContent = `Error creating resource: ${error.message}`;
                messageElement.className = 'text-danger text-center';
            }
        });

    } catch (error) {
        messageElement.textContent = `Error fetching resources: ${error.message}`;
    }

    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Dashboard';
    backButton.className = 'btn btn-secondary mt-3';
    backButton.addEventListener('click', () => checkAuthAndRenderDashboard());
    appDiv.appendChild(backButton);
}

async function viewNotifications(appDiv) {
    appDiv.innerHTML = '<h2 class="text-center mb-3">Notifications</h2>';
    const messageElement = document.createElement('p');
    messageElement.className = 'text-center';
    appDiv.appendChild(messageElement);

    try {
        const notifications = await makeApiRequest(`${API_BASE_URL}/notifications`, 'GET');
        if (notifications.length === 0) {
            messageElement.textContent = 'No notifications found.';
        } else {
            const notificationList = document.createElement('div');
            notificationList.className = 'list-group';

            notifications.forEach(notification => {
                const listItem = document.createElement('a');
                listItem.href = '#';
                listItem.className = 'list-group-item list-group-item-action';
                if (!notification.is_read) {
                    listItem.classList.add('fw-bold', 'list-group-item-light');
                }

                listItem.innerHTML = `
                    <div class="d-flex w-100 justify-content-between">
                        <p class="mb-1">${notification.message}</p>
                        <small class="text-muted">${new Date(notification.created_at).toLocaleString()}</small>
                    </div>
                `;

                listItem.addEventListener('click', async (e) => {
                    e.preventDefault();
                    if (!notification.is_read) {
                        try {
                            await makeApiRequest(`${API_BASE_URL}/notifications/${notification.id}/read`, 'PUT');
                            notification.is_read = true; // Update local state
                            listItem.classList.remove('fw-bold', 'list-group-item-light'); // Update UI
                            updateNotificationBadge(); // Update the badge count on the main dashboard button
                        } catch (error) {
                            messageElement.textContent = `Error: ${error.message}`;
                        }
                    }
                });
                notificationList.appendChild(listItem);
            });
            appDiv.appendChild(notificationList);
        }
    } catch (error) {
        messageElement.textContent = `Error fetching notifications: ${error.message}`;
    }

    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Dashboard';
    backButton.className = 'btn btn-secondary mt-3';
    backButton.addEventListener('click', () => {
        appDiv.innerHTML = '';
        checkAuthAndRenderDashboard();
    });
    appDiv.appendChild(backButton);
}

function formatDateTimeForMySQL(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}