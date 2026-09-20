// Пример добавления связи между ячейками
fetch('https://karier-schema-default-rtdb.europe-west1.firebasedatabase.app/yacheykaConnections.json', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromYacheykaId: 'y2',
    fromYacheykaName: 'Отходящая (№2)',
    toYacheykaId: 'y5',
    toYacheykaName: 'Отходящая (№5)',
    cableName: 'КГЭ 3×95',
    createdAt: Date.now()
  })
})