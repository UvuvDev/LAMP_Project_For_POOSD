const apiBase = '/api';

const urlBase = apiBase + '/index.php';
const loginUrlBase = apiBase + '/login.php';

let userId = 0;
let firstName = "";
let lastName = "";
let userRole = "user";
let authToken = "";

function doLogin() {
  userId = 0;
  firstName = "";
  lastName = "";
  userRole = "user";
  authToken = "";

  let loginInput = document.getElementById("loginName");
  let passwordInput = document.getElementById("loginPassword");
  let login = loginInput ? loginInput.value.trim() : "";
  let password = passwordInput ? passwordInput.value.trim() : "";

  document.getElementById("loginResult").innerHTML = "";

  let jsonPayload = JSON.stringify({ username: login, password: password });
  let url = loginUrlBase;

  let xhr = new XMLHttpRequest();
  xhr.open("POST", url, true);
  xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
  try {
    xhr.onreadystatechange = function () {
      if (this.readyState === 4) {
        if (this.status === 200) {
          let jsonObject = JSON.parse(xhr.responseText);
          let user = jsonObject.user || {};
          userId = Number(user.id);

          if (userId < 1) {
            document.getElementById("loginResult").innerHTML =
              "<i class='bi bi-exclamation-circle-fill me-1'></i> User/Password combination incorrect";
            return;
          }

          firstName = user.firstName || "";
          lastName = user.lastName || "";
          userRole = user.role || "user";
          authToken = jsonObject.token || "";

          if (!authToken) {
            document.getElementById("loginResult").textContent = "Login did not return a session token";
            return;
          }

          saveCookie();
          window.location.href = "contact.html";
        } else {
          let message = "Login failed";
          try {
            message = JSON.parse(xhr.responseText).error || message;
          } catch (error) {
            // Keep the generic message when the server does not return JSON.
          }
          document.getElementById("loginResult").textContent = message;
        }
      }
    };
    xhr.send(jsonPayload);
  } catch (err) {
    document.getElementById("loginResult").innerHTML = err.message;
  }
}

function saveCookie() {
  sessionStorage.setItem("lampSession", JSON.stringify({
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
    savedSession = JSON.parse(sessionStorage.getItem("lampSession"));
  } catch (error) {
    savedSession = null;
  }

  userId = savedSession ? Number(savedSession.userId) : -1;
  firstName = savedSession ? savedSession.firstName : "";
  lastName = savedSession ? savedSession.lastName : "";
  userRole = savedSession ? savedSession.role : "user";
  authToken = savedSession ? savedSession.token : "";

  if (userId < 1 || isNaN(userId) || !authToken) {
    window.location.href = "index.html";
  } else {
    let userNameEl = document.getElementById("userName");
    if (userNameEl) {
      userNameEl.textContent = `Logged in as ${firstName} ${lastName}`;
    }
    let adminLink = document.getElementById("adminLink");
    if (adminLink && userRole === "admin") {
      adminLink.classList.remove("d-none");
    }
    searchContacts();
  }
}

function doLogout() {
  userId = 0;
  firstName = "";
  lastName = "";
  userRole = "user";
  authToken = "";
  sessionStorage.removeItem("lampSession");
  window.location.href = "index.html";
}

function addContact() {
  let newContactInput = document.getElementById("contactText");
  let newContact = newContactInput ? newContactInput.value.trim() : "";
  let resultEl = document.getElementById("contactAddResult");
  resultEl.innerHTML = "";

  if (!newContact) {
    resultEl.className = "text-warning small fw-semibold";
    resultEl.innerHTML = "<i class='bi bi-exclamation-triangle-fill me-1'></i> Please enter a contact";
    return;
  }

  let jsonPayload = JSON.stringify({ color: newContact });
  let url = urlBase;

  let xhr = new XMLHttpRequest();
  xhr.open("POST", url, true);
  xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
  xhr.setRequestHeader("Authorization", "Bearer " + authToken);
  xhr.setRequestHeader("X-User-Id", userId);

  try {
    xhr.onreadystatechange = function () {
      if (this.readyState === 4) {
        if (this.status === 201 || this.status === 200) {
          resultEl.className = "text-success-wcag small fw-semibold";
          resultEl.innerHTML = "<i class='bi bi-check-circle-fill me-1'></i> Contact successfully added!";
          newContactInput.value = "";
          searchContacts();
        } else {
          try {
            let res = JSON.parse(xhr.responseText);
            resultEl.className = "text-danger-wcag small fw-semibold";
            resultEl.innerHTML = res.error || "Failed to add contact";
          } catch (e) {
            resultEl.className = "text-danger-wcag small fw-semibold";
            resultEl.innerHTML = "Error adding contact";
          }
        }
      }
    };
    xhr.send(jsonPayload);
  } catch (err) {
    resultEl.className = "text-danger-wcag small fw-semibold";
    resultEl.innerHTML = err.message;
  }
}

function searchContacts() {
  let srchInput = document.getElementById("searchText");
  let srch = srchInput ? srchInput.value.trim() : "";
  let resultSpan = document.getElementById("contactSearchResult");
  resultSpan.innerHTML = "";

  let url = urlBase + (srch ? ("?q=" + encodeURIComponent(srch)) : "");

  let xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.setRequestHeader("Authorization", "Bearer " + authToken);
  xhr.setRequestHeader("X-User-Id", userId);

  try {
    xhr.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        resultSpan.innerHTML = "<i class='bi bi-check-circle me-1'></i> Results updated";
        let jsonObject = JSON.parse(xhr.responseText);
        let targetP = document.getElementById("contactList") || document.getElementsByTagName("p")[0];

        let contacts = jsonObject.contacts || [];
        if (contacts.length === 0 && Array.isArray(jsonObject.results) && jsonObject.results.length > 0) {
          contacts = jsonObject.results.map(name => ({ id: null, name: name }));
        }

        if (contacts.length === 0 || jsonObject.error === "No Records Found") {
          if (targetP) targetP.innerHTML = `<div class="text-secondary-contrast small italic py-2"><i class="bi bi-info-circle me-1"></i> No matching contacts found.</div>`;
          return;
        }

        let contactList = "";
        for (let i = 0; i < contacts.length; i++) {
          let c = contacts[i];
          let contactName = typeof c === 'string' ? c : c.name;
          let contactId = (typeof c === 'object' && c.id) ? c.id : null;

          contactList += `<span class="badge rounded-pill bg-dark-subtle text-body border border-secondary px-3 py-2 fs-6 shadow-sm d-inline-flex align-items-center me-2 mb-2">
            <span class="me-2">👤</span>
            <span class="me-2">${contactName}</span>
            <button type="button" class="btn-close btn-close-white" style="font-size: 0.65rem;" onclick="deleteContact(${contactId ? contactId : `'${contactName.replace(/'/g, "\\'")}'`});" title="Delete Contact"></button>
          </span>`;
        }

        if (targetP) {
          targetP.innerHTML = contactList;
        }
      }
    };
    xhr.send();
  } catch (err) {
    resultSpan.innerHTML = err.message;
  }
}

function deleteContact(identifier) {
  if (!identifier && identifier !== 0) return;

  let param = (typeof identifier === 'number') ? ("id=" + identifier) : ("name=" + encodeURIComponent(identifier));
  let url = urlBase + "?" + param;

  let xhr = new XMLHttpRequest();
  xhr.open("DELETE", url, true);
  xhr.setRequestHeader("Authorization", "Bearer " + authToken);
  xhr.setRequestHeader("X-User-Id", userId);

  try {
    xhr.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        searchContacts();
      }
    };
    xhr.send();
  } catch (err) {
    console.error(err);
  }
}
