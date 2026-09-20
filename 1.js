// Добавление тестовой КСР в работу
fetch('https://karier-schema-default-rtdb.europe-west1.firebasedatabase.app/ksrInWork.json', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'КСР-1',
    number: '01',
    type: 'КСР-6-10',
    location: 'Карьер Западный, участок №3',
    status: 'вкл',
    createdAt: Date.now()
  })
})
.then(res => res.json())
.then(data => console.log('✅ КСР добавлена:', data))
.catch(err => console.error('❌ Ошибка:', err))