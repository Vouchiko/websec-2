$(document).ready(function() {
    const params = new URLSearchParams(window.location.search);
    const staffId = params.get('staffId');
    let weekNumber = parseInt(params.get('week')) || 1;
    
    if (!staffId) {
      $('#teacherScheduleContent').text('Параметр staffId не указан');
      return;
    }
    
    function loadTeacherSchedule(id, week) {
      $.getJSON(`/api/teacherSchedule?staffId=${id}&week=${week}`, function(data) {
        renderSchedule(data.teacherName, data.dates, data.schedule);
        updateWeekDisplay(week);
        setNavButtons(week);
      }).fail(function() {
        $('#teacherScheduleContent').text('Ошибка загрузки расписания');
      });
    }
    
    function renderSchedule(teacherName, dates, scheduleData) {
      $('#teacherTitle').text(teacherName);
      const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
      const timeKeys = Object.keys(scheduleData);
      const table = $('<table>').addClass('schedule-table');
      const thead = $('<thead>');
      const tbody = $('<tbody>');
      
      let headerRow = $('<tr>').append($('<th>').text('Время'));
      days.forEach((day, i) => {
        headerRow.append($('<th>').text(`${day} (${dates[i] || ''})`));
      });
      thead.append(headerRow);
      
      timeKeys.forEach(time => {
        let row = $('<tr>').append($('<td>').text(time));
        days.forEach(day => {
          const cellHtml = scheduleData[time][day] !== '-' ? scheduleData[time][day] : '-';
          row.append($('<td>').html(cellHtml));
        });
        tbody.append(row);
      });
      
      table.append(thead, tbody);
      $('#teacherScheduleContent').empty().append(table);
    }
    
    function updateWeekDisplay(week) {
      $('#currentTeacherWeek').text(`Неделя ${week}`);
    }
    
    function setNavButtons(week) {
      const prevWeek = week > 1 ? week - 1 : 52;
      const nextWeek = week < 52 ? week + 1 : 1;
      $('#prevWeekBtn').text(`Неделя ${prevWeek}`);
      $('#nextWeekBtn').text(`Неделя ${nextWeek}`);
    }
    
    function populateWeekSelector() {
      for (let i = 1; i <= 52; i++) {
        $('#weekSelector').append($('<option>', {
          value: i,
          text: `${i} неделя`
        }));
      }
    }
    
    populateWeekSelector();
    $('#weekSelector').val(weekNumber);
    
    $('#weekSelector').change(function() {
      weekNumber = parseInt($(this).val(), 10);
      updateUrl(weekNumber);
      loadTeacherSchedule(staffId, weekNumber);
    });
    
    $('#prevWeekBtn').click(function() {
      weekNumber = weekNumber > 1 ? weekNumber - 1 : 52;
      $('#weekSelector').val(weekNumber).trigger('change');
    });
    
    $('#nextWeekBtn').click(function() {
      weekNumber = weekNumber < 52 ? weekNumber + 1 : 1;
      $('#weekSelector').val(weekNumber).trigger('change');
    });
    
    function updateUrl(week) {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('staffId', staffId);
      currentUrl.searchParams.set('week', week);
      window.history.pushState({}, '', currentUrl.toString());
    }
    
    loadTeacherSchedule(staffId, weekNumber);
  });
  