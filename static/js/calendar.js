document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const calendarDays = document.getElementById('calendar-days');
  const currentMonthEl = document.getElementById('current-month');
  const prevMonthBtn = document.getElementById('prev-month');
  const nextMonthBtn = document.getElementById('next-month');
  const timeSlots = document.getElementById('time-slots');
  const selectedDatetimeEl = document.getElementById('selected-datetime');
  const confirmBtn = document.getElementById('confirm-datetime');
  const datetimeInput = document.querySelector('input[type="datetime-local"]');

  // State
  let currentDate = new Date();
  let selectedDate = null;
  let selectedTime = null;

  // Turkish month names
  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  // Available dates from the server (you can populate this from your available_dates variable)
  const availableDates = [];

  // Initialize the calendar
  function initCalendar() {
    renderCalendar(currentDate);

    // Event listeners
    prevMonthBtn.addEventListener('click', function() {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar(currentDate);
    });

    nextMonthBtn.addEventListener('click', function() {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar(currentDate);
    });

    // Set up time slot selection
    timeSlots.addEventListener('click', function(e) {
      if (e.target.tagName === 'BUTTON') {
        // Remove active class from all time slots
        timeSlots.querySelectorAll('button').forEach(btn => {
          btn.classList.remove('btn-active');
        });

        // Add active class to selected time slot
        e.target.classList.add('btn-active');
        selectedTime = e.target.textContent;
        updateSelectedDatetime();
      }
    });

    // Confirm button
    confirmBtn.addEventListener('click', function() {
      if (selectedDate && selectedTime) {
        // Format the date for the datetime-local input
        const [day, month, year] = selectedDate.split('/');
        const [hours, minutes] = selectedTime.split(':');

        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        datetimeInput.value = formattedDate;

        // Close the calendar (if it's a modal or dropdown)
        // toggleCalendar();
      }
    });
  }

  // Render the calendar for the given month
  function renderCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();

    // Update the month display
    currentMonthEl.textContent = `${monthNames[month]} ${year}`;

    // Clear the calendar
    calendarDays.innerHTML = '';

    // Get the first day of the month
    const firstDay = new Date(year, month, 1);
    // Get the last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Get the day of the week of the first day (0 = Sunday, 1 = Monday, etc.)
    let firstDayOfWeek = firstDay.getDay();
    if (firstDayOfWeek === 0) firstDayOfWeek = 7; // Convert Sunday from 0 to 7

    // Get the number of days in the previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    // Add days from the previous month
    for (let i = firstDayOfWeek - 1; i > 0; i--) {
      const dayBtn = document.createElement('button');
      dayBtn.classList.add('btn', 'btn-sm', 'btn-ghost', 'opacity-50');
      dayBtn.type = 'button';
      dayBtn.textContent = prevMonthLastDay - i + 1;
      calendarDays.appendChild(dayBtn);
    }

    // Add days of the current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const dayBtn = document.createElement('button');
      dayBtn.classList.add('btn', 'btn-sm', 'btn-ghost');
      dayBtn.type = 'button';
      dayBtn.textContent = i;

      // Check if this day is available
      const dateString = `${i.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`;
      if (isDateAvailable(dateString)) {
        dayBtn.addEventListener('click', function() {
          // Remove active class from all days
          calendarDays.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('btn-active');
          });

          // Add active class to selected day
          dayBtn.classList.add('btn-active');

          // Update selected date
          selectedDate = dateString;
          updateSelectedDatetime();
        });
      } else {
        dayBtn.classList.add('btn-disabled');
      }

      calendarDays.appendChild(dayBtn);
    }

    // Add days from the next month if needed
    const totalDaysDisplayed = firstDayOfWeek - 1 + lastDay.getDate();
    const remainingCells = 42 - totalDaysDisplayed; // 6 rows of 7 days

    for (let i = 1; i <= remainingCells; i++) {
      const dayBtn = document.createElement('button');
      dayBtn.classList.add('btn', 'btn-sm', 'btn-ghost', 'opacity-50');
      dayBtn.type = 'button';
      dayBtn.textContent = i;
      calendarDays.appendChild(dayBtn);
    }
  }

  // Check if a date is available
  function isDateAvailable(dateString) {
    // You can implement your own logic here
    // For now, all days are available
    return true;
  }

  // Update the selected datetime display
  function updateSelectedDatetime() {
    if (selectedDate && selectedTime) {
      selectedDatetimeEl.textContent = `${selectedDate} ${selectedTime}`;
    }
  }

  // Initialize the calendar
  initCalendar();
});