const form = document.getElementById('orderForm');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  // добавляем данные с первой страницы
  data.name = sessionStorage.getItem('name');
  data.phone = sessionStorage.getItem('phone');
  data.service = 'phone';

  // защита на случай, если пользователь зашёл напрямую
  if (!data.name || !data.phone) {
    alert('Пожалуйста, начните с главной страницы');
    window.location.href = '/';
    return;
  }

  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (response.ok) {
    sessionStorage.clear();
    window.location.href = '/thanks.html';
  } else {
    alert('Ошибка отправки заявки');
  }
});
