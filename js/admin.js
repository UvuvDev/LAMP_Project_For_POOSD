const adminApiBase = '/api/admin.php';

let adminSession = null;

try {
  adminSession = JSON.parse(sessionStorage.getItem('lampSession'));
} catch (error) {
  adminSession = null;
}

function leaveAdmin() {
  sessionStorage.removeItem('lampSession');
  window.location.href = 'index.html';
}

function showAdminMessage(message, isError = false) {
  const element = document.getElementById('adminResult');
  element.textContent = message;
  element.className = isError
    ? 'small fw-semibold text-danger-wcag'
    : 'small fw-semibold text-success-wcag';
}

async function adminRequest(options = {}, userId = null) {
  const url = userId === null
    ? adminApiBase
    : `${adminApiBase}?id=${encodeURIComponent(userId)}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminSession.token}`,
      ...(options.headers || {})
    }
  });

  let body = {};
  try {
    body = await response.json();
  } catch (error) {
    body = {};
  }

  if (response.status === 401 || response.status === 403) {
    leaveAdmin();
    throw new Error('Administrator session expired');
  }

  if (!response.ok) {
    throw new Error(body.error || 'Request failed');
  }

  return body;
}

function addCell(row, value) {
  const cell = document.createElement('td');
  cell.textContent = value;
  row.appendChild(cell);
  return cell;
}

function renderUsers(users) {
  const body = document.getElementById('userRows');
  body.replaceChildren();

  users.forEach((user) => {
    const row = document.createElement('tr');
    addCell(row, `${user.firstName} ${user.lastName}`.trim());
    addCell(row, user.username);
    addCell(row, user.role === 'admin' ? 'Admin' : 'User');

    const statusCell = document.createElement('td');
    const status = document.createElement('span');
    status.className = user.isActive ? 'badge text-bg-success' : 'badge text-bg-secondary';
    status.textContent = user.isActive ? 'Active' : 'Disabled';
    statusCell.appendChild(status);
    row.appendChild(statusCell);

    const actions = document.createElement('td');
    actions.className = 'd-flex flex-wrap gap-2';

    const passwordButton = document.createElement('button');
    passwordButton.type = 'button';
    passwordButton.className = 'btn btn-sm btn-outline-light';
    passwordButton.textContent = 'Change password';
    passwordButton.addEventListener('click', () => changePassword(user));
    actions.appendChild(passwordButton);

    const statusButton = document.createElement('button');
    statusButton.type = 'button';
    statusButton.className = user.isActive
      ? 'btn btn-sm btn-outline-danger'
      : 'btn btn-sm btn-outline-success';
    statusButton.textContent = user.isActive ? 'Disable' : 'Enable';
    statusButton.addEventListener('click', () => changeStatus(user));
    actions.appendChild(statusButton);

    row.appendChild(actions);
    body.appendChild(row);
  });
}

async function loadUsers() {
  try {
    const result = await adminRequest();
    renderUsers(result.users || []);
  } catch (error) {
    showAdminMessage(error.message, true);
  }
}

async function changePassword(user) {
  const password = window.prompt(`Enter a new password for ${user.username} (minimum 8 characters):`);
  if (password === null) return;

  if (password.length < 8) {
    showAdminMessage('Password must be at least 8 characters.', true);
    return;
  }

  const confirmation = window.prompt('Enter the new password again:');
  if (confirmation !== password) {
    showAdminMessage('Passwords did not match.', true);
    return;
  }

  try {
    await adminRequest({
      method: 'PATCH',
      body: JSON.stringify({ password: password })
    }, user.id);

    if (Number(user.id) === Number(adminSession.userId)) {
      window.alert('Your password was changed. Please sign in again.');
      leaveAdmin();
      return;
    }

    showAdminMessage(`Password changed for ${user.username}.`);
  } catch (error) {
    showAdminMessage(error.message, true);
  }
}

async function changeStatus(user) {
  const newStatus = !user.isActive;
  const verb = newStatus ? 'enable' : 'disable';
  if (!window.confirm(`Are you sure you want to ${verb} ${user.username}?`)) return;

  try {
    await adminRequest({
      method: 'PATCH',
      body: JSON.stringify({ isActive: newStatus })
    }, user.id);

    if (!newStatus && Number(user.id) === Number(adminSession.userId)) {
      window.alert('Your account was disabled.');
      leaveAdmin();
      return;
    }

    showAdminMessage(`${user.username} was ${newStatus ? 'enabled' : 'disabled'}.`);
    await loadUsers();
  } catch (error) {
    showAdminMessage(error.message, true);
  }
}

async function createAdmin(event) {
  event.preventDefault();

  const payload = {
    firstName: document.getElementById('adminFirstName').value.trim(),
    lastName: document.getElementById('adminLastName').value.trim(),
    username: document.getElementById('adminUsername').value.trim(),
    password: document.getElementById('adminPassword').value
  };

  try {
    await adminRequest({
      method: 'POST',
      body: JSON.stringify(payload)
    });

    event.target.reset();
    showAdminMessage(`Administrator ${payload.username} was created.`);
    await loadUsers();
  } catch (error) {
    showAdminMessage(error.message, true);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!adminSession || adminSession.role !== 'admin' || !adminSession.token) {
    window.location.href = 'contact.html';
    return;
  }

  document.getElementById('adminName').textContent =
    `${adminSession.firstName} ${adminSession.lastName}`.trim();
  document.getElementById('createAdminForm').addEventListener('submit', createAdmin);
  document.getElementById('adminLogout').addEventListener('click', leaveAdmin);
  loadUsers();
});
