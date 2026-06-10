const form = document.getElementById('startForm');

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const data = new FormData(form);

  sessionStorage.setItem('name', data.get('name'));
  sessionStorage.setItem('phone', data.get('phone'));

  const service = data.get('service');

  window.location.href = `/${service}.html`;
});
