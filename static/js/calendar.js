document.addEventListener('DOMContentLoaded', function () {
  const calendarDays = document.getElementById('calendar-days');
  const currentMonthEl = document.getElementById('current-month');
  const prevMonthBtn = document.getElementById('prev-month');
  const nextMonthBtn = document.getElementById('next-month');
  const timeSlots = document.getElementById('time-slots');
  const selectedDatetimeEl = document.getElementById('selected-datetime');
  const confirmBtn = document.getElementById('confirm-datetime');
  const datetimeInput = document.querySelector('input[type="datetime-local"]');

  let currentDate = new Date();
  let selectedDate = null;
  let selectedTime = null;

  const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

  function renderCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    currentMonthEl.textContent = `${monthNames[month]} ${year}`;
    calendarDays.innerHTML = '';

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let firstDayOfWeek = firstDay.getDay();
    if (firstDayOfWeek === 0) firstDayOfWeek = 7;

    const prevMonthLastDay = new Date(year, month, 0).getDate();

    for (let i = firstDayOfWeek - 1; i > 0; i--) {
      const dayBtn = document.createElement('button');
      dayBtn.className = 'btn btn-sm btn-ghost opacity-50';
      dayBtn.type = 'button';
      dayBtn.textContent = prevMonthLastDay - i + 1;
      calendarDays.appendChild(dayBtn);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const dayBtn = document.createElement('button');
      dayBtn.className = 'btn btn-sm btn-ghost';
      dayBtn.type = 'button';
      dayBtn.textContent = i;
      const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      dayBtn.dataset.date = formattedDate;
      calendarDays.appendChild(dayBtn);
    }

    const totalDaysDisplayed = firstDayOfWeek - 1 + lastDay.getDate();
    const remainingCells = 42 - totalDaysDisplayed;

    for (let i = 1; i <= remainingCells; i++) {
      const dayBtn = document.createElement('button');
      dayBtn.className = 'btn btn-sm btn-ghost opacity-50';
      dayBtn.type = 'button';
      dayBtn.textContent = i;
      calendarDays.appendChild(dayBtn);
    }
  }

  // Single event handler for calendar container
  document.querySelector('.calendar-container').onclick = function(e) {
    const dayButton = e.target.closest('button[data-date]');
    if (!dayButton) return;

    // Update selected date
    selectedDate = dayButton.dataset.date;

    document.querySelectorAll('button[data-date]').forEach(btn => 
      btn.classList.remove('btn-active')
    );
    dayButton.classList.add('btn-active');

    fetch(`/api/available-hours/?date=${selectedDate}`)
      .then(response => response.json())
      .then(data => {
        timeSlots.innerHTML = '';
        if (!data.available) {
          timeSlots.innerHTML = `
            <p class="text-center text-warning col-span-4">
              ${data.message || 'Bu tarih için müsait saat bulunmamaktadır.'}
            </p>`;
          return;
        }
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-4 gap-2';
        data.hours.forEach(hour => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn btn-sm btn-outline hover:bg-primary hover:text-primary-content';
          btn.textContent = hour;
          
          btn.addEventListener('click', () => {
            grid.querySelectorAll('button').forEach(timeBtn => {
              timeBtn.classList.remove('btn-active', 'bg-primary', 'text-primary-content');
            });
            btn.classList.add('btn-active', 'bg-primary', 'text-primary-content');
            
            selectedTime = hour;
            if (selectedDate && selectedTime) {
              // Format datetime for Django
              const formattedDatetime = `${selectedDate}T${selectedTime}:00`;
              datetimeInput.value = formattedDatetime;
            }
          });
          
          grid.appendChild(btn);
        });
        timeSlots.appendChild(grid);
      });
  };

  // Month navigation
  prevMonthBtn.onclick = () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar(currentDate);
  };

  nextMonthBtn.onclick = () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar(currentDate);
  };

  // Initialize
  renderCalendar(currentDate);

  // Update form submission
  document.querySelector('form').addEventListener('submit', function(e) {
    if (!selectedDate || !selectedTime) {
      e.preventDefault();
      alert('Lütfen tarih ve saat seçiniz.');
      return;
    }

    // Format datetime for Django
    const formattedDatetime = `${selectedDate}T${selectedTime}:00`;
    datetimeInput.value = formattedDatetime;
  });

  // Form validation before submit
  document.querySelector('form').addEventListener('submit', function(e) {
    if (!datetimeInput.value) {
      e.preventDefault();
      alert('Lütfen tarih ve saat seçiniz.');
      return;
    }
  });

  // Update time slot selection
  function createTimeSlots(data, grid) {
    data.hours.forEach(hour => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-sm btn-outline hover:bg-primary hover:text-primary-content';
      btn.textContent = hour;
      
      btn.addEventListener('click', () => {
        grid.querySelectorAll('button').forEach(timeBtn => {
          timeBtn.classList.remove('btn-active', 'bg-primary', 'text-primary-content');
        });
        btn.classList.add('btn-active', 'bg-primary', 'text-primary-content');
        
        selectedTime = hour;
        if (selectedDate && selectedTime) {
          datetimeInput.value = `${selectedDate}T${selectedTime}:00`;
        }
      });
      
      grid.appendChild(btn);
    });
  }
});