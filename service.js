$(document).ready(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const selectedGroup = urlParams.get('groupId');
    const weekParam = urlParams.get('week');
  
    $.getJSON('/api/groups', function(groups) {
      groups.forEach(group => {
        $('#groupDropdown').append($('<option>', {
          value: group.id,
          text: group.name
        }));
      });
      populateWeekOptions();
  
      if (selectedGroup) {
        $('#groupDropdown').val(selectedGroup);
      }
  
      $('#groupDropdown, #weekDropdown').change(function() {
        const weekVal = $('#weekDropdown').val();
        const groupVal = $('#groupDropdown').val();
        if (weekVal && groupVal) {
          setCurrentWeekDisplay(weekVal);
          setNavButtons(weekVal);
          updateUrlHistory(groupVal, weekVal);
          fetchSchedule(groupVal, weekVal);
        }
      });
  
      if (weekParam && selectedGroup) {
        $('#weekDropdown').val(parseInt(weekParam, 10));
        setCurrentWeekDisplay(weekParam);
        setNavButtons(weekParam);
        fetchSchedule(selectedGroup, weekParam);
      } else {
        setNavButtons(1);
      }
  
      $('#prevBtn').click(function() {
        let currentWeek = parseInt($('#weekDropdown').val(), 10) || 1;
        const groupVal = $('#groupDropdown').val();
        currentWeek = currentWeek > 1 ? currentWeek - 1 : 52;
        $('#weekDropdown').val(currentWeek).trigger('change');
        if (groupVal) {
          updateUrlHistory(groupVal, currentWeek);
          fetchSchedule(groupVal, currentWeek);
        }
      });
  
      $('#nextBtn').click(function() {
        let currentWeek = parseInt($('#weekDropdown').val(), 10) || 1;
        const groupVal = $('#groupDropdown').val();
        currentWeek = currentWeek < 52 ? currentWeek + 1 : 1;
        $('#weekDropdown').val(currentWeek).trigger('change');
        if (groupVal) {
          updateUrlHistory(groupVal, currentWeek);
          fetchSchedule(groupVal, currentWeek);
        }
      });
    });
  
    function populateWeekOptions() {
      for (let i = 1; i <= 52; i++) {
        $('#weekDropdown').append($('<option>', {
          value: i,
          text: i + ' неделя'
        }));
      }
    }
  
    function setCurrentWeekDisplay(week) {
      $('#currentWeek').text(`Неделя ${week}`);
    }
  
    function setNavButtons(week) {
      const prev = week > 1 ? week - 1 : 52;
      const next = week < 52 ? parseInt(week) + 1 : 1;
      $('#prevBtn').text(`< Неделя ${prev}`);
      $('#nextBtn').text(`Неделя ${next} >`);
    }
  
    function updateUrlHistory(group, week) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('groupId', group);
      newUrl.searchParams.set('week', week);
      window.history.pushState({}, '', newUrl.toString());
    }
  
    function fetchSchedule(group, week) {
      fetch(`/api/schedule?groupId=${group}&week=${week}`)
        .then(response => {
          if (!response.ok) {
            if (response.status === 404) {
              alert('Группа не найдена');
              return;
            }
            throw new Error('Ошибка загрузки расписания');
          }
          return response.json();
        })
        .then(data => {
          displaySchedule(data.dates, data.schedule, data.groupName, data.groupInfo);
        })
        .catch(error => console.error('Ошибка:', error));
    }
  
    function displaySchedule(dates, scheduleObj, groupName, groupInfo) {
      $('#scheduleContent').empty();
      const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
      const times = Object.keys(scheduleObj);
      
      $('#scheduleTable thead tr').empty().append(
        $('<th>').text('Время'),
        ...days.map((day, index) => $('<th>').text(`${day} (${dates[index] || ''})`))
      );
  
      times.forEach(time => {
        const row = $('<tr>');
        row.append($('<td>').text(time));
        days.forEach(day => {
          const cellContent = scheduleObj[time][day] !== '-' ? scheduleObj[time][day] : '-';
          row.append($('<td>').html(cellContent));
        });
        $('#scheduleContent').append(row);
      });
  
      $('#pageTitle').text(groupName);
      $('#groupDetails').empty().append(
        $('<h2>').text(groupInfo.title),
        $('<div>').html(groupInfo.description),
        $('<div>').text(groupInfo.semesterInfo)
      );
    }
  });
  