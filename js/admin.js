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
    status.className = user.isActive
      ? 'badge text-bg-success'
      : 'badge text-bg-secondary';
    status.textContent = user.isActive ? 'Active' : 'Disabled';
    statusCell.appendChild(status);
    row.appendChild(statusCell);

    const actions = document.createElement('td');
    actions.className = 'd-flex flex-wrap gap-2';

    const entriesButton = document.createElement('button');
    entriesButton.type = 'button';
    entriesButton.className = 'btn btn-sm btn-outline-info';
    entriesButton.innerHTML = '<i class="bi bi-person-lines-fill me-1"></i> View Entries';
    entriesButton.addEventListener('click', () => viewUserEntries(user));
    actions.appendChild(entriesButton);

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

async function viewUserEntries(user) {
  showAdminAction(
    `Entries for ${user.firstName} ${user.lastName} (${user.username})`,
    `
      <div class="text-secondary">
        <i class="bi bi-hourglass-split me-1"></i>
        Loading entries...
      </div>
    `
  );

  try {
    const response = await fetch(
      `${adminApiBase}?userId=${encodeURIComponent(user.id)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminSession.token}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Unable to load entries');
    }

    const contacts = data.contacts || [];

    if (contacts.length === 0) {
      showAdminAction(
        `Entries for ${user.username}`,
        `
          <div class="text-secondary">
            <i class="bi bi-info-circle me-1"></i>
            This user has no entries.
          </div>
        `
      );
      return;
    }

    const rows = contacts.map((contact) => `
      <tr>
        <td>${escapeHtml(contact.firstName)} ${escapeHtml(contact.lastName)}</td>
        <td>${escapeHtml(contact.email)}</td>
        <td>${escapeHtml(contact.phone)}</td>
        <td>${contact.birthday ? escapeHtml(contact.birthday) : '—'}</td>
      </tr>
    `).join('');

    showAdminAction(
      `Entries for ${user.username}`,
      `
        <div class="table-responsive">
          <table class="table table-dark table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Birthday</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `
    );
  } catch (error) {
    showAdminAction(
      `Entries for ${user.username}`,
      `
        <div class="text-danger">
          <i class="bi bi-exclamation-triangle-fill me-1"></i>
          ${escapeHtml(error.message)}
        </div>
      `
    );
  }
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}

async function loadUsers() {
  try {
    const result = await adminRequest();
    renderUsers(result.users || []);
  } catch (error) {
    showAdminMessage(error.message, true);
  }
}

function closeAdminAction() {
  const panel = document.getElementById('adminActionPanel');
  const content = document.getElementById('adminActionContent');

  if (panel) panel.classList.add('d-none');
  if (content) content.innerHTML = '';
}

function showAdminAction(title, content) {
  const panel = document.getElementById('adminActionPanel');
  const titleElement = document.getElementById('adminActionTitle');
  const contentElement = document.getElementById('adminActionContent');

  if (!panel || !titleElement || !contentElement) return;

  titleElement.textContent = title;
  contentElement.innerHTML = content;
  panel.classList.remove('d-none');

  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function changePassword(user) {
  showAdminAction(
    `Change password for ${user.username}`,
    `
      <form id="changePasswordForm" class="row g-3">
        <div class="col-12 col-md-6">
          <label for="newPassword" class="form-label">New password</label>
          <input
            id="newPassword"
            type="password"
            class="form-control"
            minlength="8"
            autocomplete="new-password"
            required
          >
        </div>

        <div class="col-12 col-md-6">
          <label for="confirmPassword" class="form-label">Confirm password</label>
          <input
            id="confirmPassword"
            type="password"
            class="form-control"
            minlength="8"
            autocomplete="new-password"
            required
          >
        </div>

        <div class="col-12 d-flex gap-2 align-items-center">
          <button type="submit" class="btn btn-primary">
            <i class="bi bi-key-fill me-1"></i> Change Password
          </button>
          <button type="button" id="cancelPasswordChange" class="btn btn-outline-light">
            Cancel
          </button>
          <span id="passwordActionMessage" class="small fw-semibold"></span>
        </div>
      </form>
    `
  );

  const form = document.getElementById('changePasswordForm');
  const cancelButton = document.getElementById('cancelPasswordChange');

  cancelButton.addEventListener('click', closeAdminAction);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const password = document.getElementById('newPassword').value;
    const confirmation = document.getElementById('confirmPassword').value;
    const message = document.getElementById('passwordActionMessage');

    if (password.length < 8) {
      message.textContent = 'Password must be at least 8 characters.';
      message.className = 'small fw-semibold text-danger';
      return;
    }

    if (confirmation !== password) {
      message.textContent = 'Passwords did not match.';
      message.className = 'small fw-semibold text-danger';
      return;
    }

    try {
      await adminRequest({
        method: 'PATCH',
        body: JSON.stringify({ password: password })
      }, user.id);

      if (Number(user.id) === Number(adminSession.userId)) {
        showAdminAction(
          'Password changed',
          `
            <div class="text-success mb-3">
              <i class="bi bi-check-circle-fill me-1"></i>
              Your password was changed successfully.
            </div>
            <p class="mb-3">Please sign in again with your new password.</p>
            <button type="button" id="adminActionLogout" class="btn btn-danger">
              Sign In Again
            </button>
          `
        );

        document.getElementById('adminActionLogout').addEventListener('click', leaveAdmin);
        return;
      }

      showAdminAction(
        'Password changed',
        `
          <div class="text-success">
            <i class="bi bi-check-circle-fill me-1"></i>
            Password changed successfully for ${user.username}.
          </div>
        `
      );

      await loadUsers();
    } catch (error) {
      message.textContent = error.message;
      message.className = 'small fw-semibold text-danger';
    }
  });
}

async function changeStatus(user) {
  const newStatus = !user.isActive;
  const verb = newStatus ? 'enable' : 'disable';

  showAdminAction(
    `${verb.charAt(0).toUpperCase() + verb.slice(1)} ${user.username}`,
    `
      <p class="mb-3">
        Are you sure you want to ${verb}
        <strong>${user.username}</strong>?
      </p>

      <div class="d-flex gap-2">
        <button type="button" id="confirmStatusChange" class="btn ${newStatus ? 'btn-success' : 'btn-danger'}">
          <i class="bi ${newStatus ? 'bi-person-check-fill' : 'bi-person-x-fill'} me-1"></i>
          Yes, ${verb}
        </button>

        <button type="button" id="cancelStatusChange" class="btn btn-outline-light">
          Cancel
        </button>
      </div>

      <div id="statusActionMessage" class="small fw-semibold mt-3"></div>
    `
  );

  document.getElementById('cancelStatusChange')
    .addEventListener('click', closeAdminAction);

  document.getElementById('confirmStatusChange')
    .addEventListener('click', async () => {
      const message = document.getElementById('statusActionMessage');

      try {
        await adminRequest({
          method: 'PATCH',
          body: JSON.stringify({ isActive: newStatus })
        }, user.id);

        if (!newStatus && Number(user.id) === Number(adminSession.userId)) {
          showAdminAction(
            'Account disabled',
            `
              <div class="text-danger mb-3">
                <i class="bi bi-x-circle-fill me-1"></i>
                Your account was disabled.
              </div>

              <button type="button" id="adminActionLogout" class="btn btn-danger">
                Return to Login
              </button>
            `
          );

          document.getElementById('adminActionLogout')
            .addEventListener('click', leaveAdmin);

          return;
        }

        showAdminAction(
          `User ${newStatus ? 'enabled' : 'disabled'}`,
          `
            <div class="text-success">
              <i class="bi bi-check-circle-fill me-1"></i>
              ${user.username} was ${newStatus ? 'enabled' : 'disabled'}.
            </div>
          `
        );

        await loadUsers();
      } catch (error) {
        message.textContent = error.message;
        message.className = 'small fw-semibold text-danger';
      }
    });
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
