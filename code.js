const apiBase = '/api';
const contactUrl = apiBase + '/index.php';
const loginUrl = apiBase + '/login.php';
const registerUrl = apiBase + '/register.php';

let userId = 0;
let firstName = '';
let lastName = '';
let userRole = 'user';
let authToken = '';
let currentContacts = [];

function setMessage(element, message, type = 'error') {
  if (!element) return;
  element.textContent = message;
  const colorClass = type === 'success'
    ? 'text-success-wcag'
    : type === 'info'
      ? 'text-info-wcag'
      : type === 'warning'
        ? 'text-warning'
        : 'text-danger-wcag';
  element.className = `small fw-semibold ${colorClass}`;
}

async function requestJson(url, options = {}, authenticated = true) {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (authenticated) headers.Authorization = `Bearer ${authToken}`;

  const response = await fetch(url, { ...options, headers: headers });
  let body = {};
  try {
    body = await response.json();
  } catch (error) {
    body = {};
  }

  if (authenticated && response.status === 401) {
    doLogout();
    throw new Error('Your session expired. Please sign in again.');
  }

  if (!response.ok) {
    throw new Error(body.error || 'Request failed');
  }

  return body;
}

async function doLogin() {
  const loginInput = document.getElementById('loginName');
  const passwordInput = document.getElementById('loginPassword');
  const result = document.getElementById('loginResult');
  const login = loginInput ? loginInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  setMessage(result, '', 'info');

  try {
    const response = await requestJson(loginUrl, {
      method: 'POST',
      body: JSON.stringify({ username: login, password: password })
    }, false);
    const user = response.user || {};

    userId = Number(user.id);
    firstName = user.firstName || '';
    lastName = user.lastName || '';
    userRole = user.role || 'user';
    authToken = response.token || '';

    if (userId < 1 || !authToken) {
      throw new Error('Login response was incomplete');
    }

    saveCookie();
    window.location.href = 'contact.html';
  } catch (error) {
    setMessage(result, error.message);
  }
}

function saveCookie() {
  sessionStorage.setItem('lampSession', JSON.stringify({
    userId: userId,
    firstName: firstName,
    lastName: lastName,
    role: userRole,
    token: authToken
  }));
}

function readCookie() {
  let savedSession = null;
  try {
    savedSession = JSON.parse(sessionStorage.getItem('lampSession'));
  } catch (error) {
    savedSession = null;
  }

  userId = savedSession ? Number(savedSession.userId) : -1;
  firstName = savedSession ? savedSession.firstName : '';
  lastName = savedSession ? savedSession.lastName : '';
  userRole = savedSession ? savedSession.role : 'user';
  authToken = savedSession ? savedSession.token : '';

  if (userId < 1 || Number.isNaN(userId) || !authToken) {
    window.location.href = 'index.html';
    return;
  }

  const userName = document.getElementById('userName');
  if (userName) userName.textContent = `Logged in as ${firstName} ${lastName}`;

  const adminLink = document.getElementById('adminLink');
  if (adminLink && userRole === 'admin') adminLink.classList.remove('d-none');

  searchContacts();
}

function doLogout() {
  userId = 0;
  firstName = '';
  lastName = '';
  userRole = 'user';
  authToken = '';
  currentContacts = [];
  sessionStorage.removeItem('lampSession');
  window.location.href = 'index.html';
}

function contactFormValues(prefix) {
  return {
    firstName: document.getElementById(`${prefix}FirstName`).value.trim(),
    lastName: document.getElementById(`${prefix}LastName`).value.trim(),
    email: document.getElementById(`${prefix}Email`).value.trim(),
    phone: document.getElementById(`${prefix}Phone`).value.trim(),
    birthday: document.getElementById(`${prefix}Birthday`).value
  };
}

function validateContact(contact, result) {
  if (!contact.firstName || !contact.lastName || !contact.email || !contact.phone) {
    setMessage(result, 'Please complete all required fields.', 'warning');
    return false;
  }

  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.value = contact.email;
  if (!emailInput.checkValidity()) {
    setMessage(result, 'Enter a valid email address.');
    return false;
  }

  return true;
}

async function addContact() {
  const result = document.getElementById('contactAddResult');
  const contact = contactFormValues('contact');
  if (!validateContact(contact, result)) return;

  try {
    await requestJson(contactUrl, {
      method: 'POST',
      body: JSON.stringify(contact)
    });

    ['FirstName', 'LastName', 'Email', 'Phone', 'Birthday'].forEach((field) => {
      document.getElementById(`contact${field}`).value = '';
    });
    setMessage(result, 'Contact successfully added!', 'success');
    await searchContacts();
  } catch (error) {
    setMessage(result, error.message);
  }
}

function appendContactDetail(parent, iconClass, label, value) {
  const line = document.createElement('p');
  line.className = 'mb-2';

  const icon = document.createElement('i');
  icon.className = `bi ${iconClass} me-2`;
  line.appendChild(icon);

  const strong = document.createElement('strong');
  strong.textContent = `${label}: `;
  line.appendChild(strong);
  line.appendChild(document.createTextNode(value || 'Not provided'));
  parent.appendChild(line);
}

function renderContacts(contacts) {
  const list = document.getElementById('contactList');
  list.replaceChildren();

  if (contacts.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-secondary-contrast small fst-italic py-2';
    empty.textContent = 'No matching contacts found.';
    list.appendChild(empty);
    return;
  }

  contacts.forEach((contact) => {
    const card = document.createElement('article');
    card.className = 'card bg-dark text-light border-secondary mb-3';
    const body = document.createElement('div');
    body.className = 'card-body';

    const title = document.createElement('h3');
    title.className = 'h5 card-title mb-3';
    title.textContent = `${contact.firstName} ${contact.lastName}`.trim();
    body.appendChild(title);

    appendContactDetail(body, 'bi-envelope', 'Email', contact.email);
    appendContactDetail(body, 'bi-telephone', 'Phone', contact.phone);
    appendContactDetail(body, 'bi-calendar', 'Birthday', contact.birthday);

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'btn btn-outline-light btn-sm me-2';
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => editContact(contact.id));
    body.appendChild(editButton);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'btn btn-outline-danger btn-sm';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => deleteContact(contact.id));
    body.appendChild(deleteButton);

    card.appendChild(body);
    list.appendChild(card);
  });
}

async function searchContacts() {
  const searchInput = document.getElementById('searchText');
  const result = document.getElementById('contactSearchResult');
  const search = searchInput ? searchInput.value.trim() : '';
  const url = contactUrl + (search ? `?q=${encodeURIComponent(search)}` : '');

  try {
    const response = await requestJson(url);
    currentContacts = response.contacts || [];
    renderContacts(currentContacts);
    setMessage(result, `${currentContacts.length} contact${currentContacts.length === 1 ? '' : 's'} found`, 'info');
  } catch (error) {
    setMessage(result, error.message);
  }
}

async function deleteContact(contactId) {
  const contact = currentContacts.find((item) => Number(item.id) === Number(contactId));
  const name = contact ? `${contact.firstName} ${contact.lastName}`.trim() : 'this contact';
  if (!window.confirm(`Delete ${name}?`)) return;

  try {
    await requestJson(`${contactUrl}?id=${encodeURIComponent(contactId)}`, { method: 'DELETE' });
    cancelEditContact();
    await searchContacts();
  } catch (error) {
    setMessage(document.getElementById('contactSearchResult'), error.message);
  }
}

function editContact(contactId) {
  const contact = currentContacts.find((item) => Number(item.id) === Number(contactId));
  if (!contact) return;

  document.getElementById('editContactId').value = contact.id;
  document.getElementById('editFirstName').value = contact.firstName || '';
  document.getElementById('editLastName').value = contact.lastName || '';
  document.getElementById('editEmail').value = contact.email || '';
  document.getElementById('editPhone').value = contact.phone || '';
  document.getElementById('editBirthday').value = contact.birthday || '';
  setMessage(document.getElementById('editContactResult'), '', 'info');

  const section = document.getElementById('editContactSection');
  section.classList.remove('d-none');
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function saveEditedContact() {
  const contactId = Number(document.getElementById('editContactId').value);
  const result = document.getElementById('editContactResult');
  const contact = contactFormValues('edit');

  if (contactId < 1) {
    setMessage(result, 'Invalid contact.');
    return;
  }
  if (!validateContact(contact, result)) return;

  try {
    await requestJson(`${contactUrl}?id=${encodeURIComponent(contactId)}`, {
      method: 'PUT',
      body: JSON.stringify(contact)
    });
    setMessage(result, 'Contact updated successfully!', 'success');
    await searchContacts();
    window.setTimeout(cancelEditContact, 500);
  } catch (error) {
    setMessage(result, error.message);
  }
}

function cancelEditContact() {
  const section = document.getElementById('editContactSection');
  if (section) section.classList.add('d-none');
}

async function registerUser() {
  const result = document.getElementById('registerResult');
  const first = document.getElementById('registerFirstName').value.trim();
  const last = document.getElementById('registerLastName').value.trim();
  const username = document.getElementById('registerUsername').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirmation = document.getElementById('registerPasswordConfirm').value;

  if (!first || !last || !username || !password) {
    setMessage(result, 'Please complete all fields.', 'warning');
    return;
  }
  if (password.length < 8) {
    setMessage(result, 'Password must be at least 8 characters.');
    return;
  }
  if (password !== confirmation) {
    setMessage(result, 'Passwords do not match.');
    return;
  }

  try {
    await requestJson(registerUrl, {
      method: 'POST',
      body: JSON.stringify({
        first_name: first,
        last_name: last,
        username: username,
        password: password
      })
    }, false);
    setMessage(result, 'Account created! Redirecting to login...', 'success');
    window.setTimeout(() => { window.location.href = 'index.html'; }, 1000);
  } catch (error) {
    setMessage(result, error.message);
  }
}
