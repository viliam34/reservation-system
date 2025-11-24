// calendar.js

// Initialize current date
let currentDate = new Date();
let selectedDay = null;
let selectedHourRange = [];

// Function to render the calendar
function renderCalendar() {
  const monthElement = document.querySelector('.month ul li.current-month');
  const daysElement = document.querySelector('.days');
  const hoursElement = document.querySelector('.hours ul');
  const nextArrow = document.querySelector('.month ul li.next');

  // Clear existing days and hours
  daysElement.innerHTML = '';
  hoursElement.innerHTML = '';

  // Get current month and year
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Update month and year in the header
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  monthElement.innerHTML = `${monthNames[month]}<br><span style="font-size:18px">${year}</span>`;

  // Replace next arrow content with '>'
  nextArrow.innerHTML = '&gt;';

  // Get the first day of the month
  const firstDay = new Date(year, month, 1).getDay();

  // Get the number of days in the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Add blank days for the first week
  for (let i = 0; i < firstDay; i++) {
    const blankDay = document.createElement('li');
    blankDay.textContent = '';
    daysElement.appendChild(blankDay);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = document.createElement('li');
    dayElement.textContent = day;

    // Add click event listener for day selection
    dayElement.addEventListener('click', () => {
      if (selectedDay) {
        selectedDay.classList.remove('active');
      }
      dayElement.classList.add('active');
      selectedDay = dayElement;
    });

    daysElement.appendChild(dayElement);
  }

  // Add hours
  for (let hour = 1; hour <= 24; hour++) {
    const hourElement = document.createElement('li');
    hourElement.textContent = hour;

    // Add click event listener for hour range selection
    hourElement.addEventListener('click', () => {
      if (selectedHourRange.length === 0) {
        // First hour selected
        selectedHourRange.push(hour);
        hourElement.classList.add('active-hour');
      } else if (selectedHourRange.length === 1) {
        // Second hour selected, select range
        selectedHourRange.push(hour);
        const [start, end] = selectedHourRange.sort((a, b) => a - b);

        // Highlight the range
        const hourElements = hoursElement.querySelectorAll('li');
        hourElements.forEach((el) => {
          const hourValue = parseInt(el.textContent, 10);
          if (hourValue >= start && hourValue <= end) {
            el.classList.add('active-hour');
          }
        });

        selectedHourRange = []; // Reset the range
      }
    });

    hoursElement.appendChild(hourElement);
  }
}

// Function to change the month
function changeMonth(direction) {
  currentDate.setMonth(currentDate.getMonth() + direction);
  renderCalendar();
}

// Add event listeners to the arrows
document.querySelector('.prev').addEventListener('click', () => changeMonth(-1));
document.querySelector('.next').addEventListener('click', () => changeMonth(1));

// Add event listener for the 'Clear Hours' button
document.getElementById('clear-hours').addEventListener('click', () => {
  const hourElements = document.querySelectorAll('.hours ul li');
  hourElements.forEach((hour) => {
    hour.classList.remove('active-hour');
  });
});

// Add event listeners for start and end time selectors
document.getElementById('start-time').addEventListener('change', updateHourSelection);
document.getElementById('end-time').addEventListener('change', updateHourSelection);

function updateHourSelection() {
  const startTime = document.getElementById('start-time').value;
  const endTime = document.getElementById('end-time').value;

  if (startTime && endTime) {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const start = startHour + startMinute / 60;
    const end = endHour + endMinute / 60;

    const hourElements = document.querySelectorAll('.hours ul li');
    hourElements.forEach((el) => {
      const hourValue = parseInt(el.textContent, 10);
      if (hourValue >= start && hourValue <= end) {
        el.classList.add('active-hour');
      } else {
        el.classList.remove('active-hour');
      }
    });
  }
}

// Initial render
renderCalendar();