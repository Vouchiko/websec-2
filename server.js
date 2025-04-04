const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();

// Клиентские файлы теперь размещаются в папке "public"
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Сопоставление идентификаторов групп с их наименованиями
const groupMapping = {
  "1282690301": "6411-100503D",
  "1282690279": "6412-100503D",
  "1213641978": "6413-100503D"
};

app.get('/api/groups', (req, res) => {
  const groupsList = Object.keys(groupMapping).map(id => ({
    id,
    name: groupMapping[id].split('-')[0]
  }));
  res.json(groupsList);
});

app.get('/api/schedule', async (req, res) => {
  const { groupId, week } = req.query;
  if (!groupId || !week) {
    return res.status(400).json({ error: 'Параметры groupId и week обязательны' });
  }
  const scheduleUrl = `https://ssau.ru/rasp?groupId=${groupId}&selectedWeek=${week}`;
  console.info(`Получение расписания по URL: ${scheduleUrl}`);
  
  try {
    const { data } = await axios.get(scheduleUrl);
    const $ = cheerio.load(data);
    const title = $('.page-header h1.h1-text').text().trim();
    if (!title) return res.status(404).json({ error: 'Группа не найдена' });

    let scheduleData = {};
    const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    let dateList = [];
    $('.schedule__item.schedule__head').each((i, el) => {
      const dt = $(el).find('.caption-text.schedule__head-date').text().trim();
      if (dt) dateList.push(dt);
    });

    const timeIntervals = [];
    $('.schedule__time-item').each((i, el) => {
      const t = $(el).text().trim();
      if (i % 2 === 0) {
        timeIntervals.push(t + ' - ');
      } else {
        timeIntervals[timeIntervals.length - 1] += t;
      }
    });

    timeIntervals.forEach(timeSlot => {
      scheduleData[timeSlot] = {};
      dayNames.forEach(day => scheduleData[timeSlot][day] = '-');
    });

    let groupDetails = $('.card-default.info-block');
    let descriptionHTML = '';
    groupDetails.find('.info-block__description div').each((i, el) => {
      descriptionHTML += $(el).text().trim() + '<br>';
    });
    const infoTitle = groupDetails.find('.info-block__title').text().trim();
    const semesterInfo = groupDetails.find('.info-block__semester div').text().trim();

    $('.schedule__item:not(.schedule__head)').each((i, cell) => {
      const currentDay = dayNames[i % dayNames.length];
      const timeIndex = Math.floor(i / dayNames.length);
      const currentTime = timeIntervals[timeIndex];
      $(cell).find('.schedule__lesson').each((j, lessonElem) => {
        const lessonEl = $(lessonElem);
        const lessonType = lessonEl.find('.schedule__lesson-type-chip').attr('class');
        const lessonInfoEl = lessonEl.find('.schedule__lesson-info');
        const subjectText = lessonInfoEl.find('.body-text.schedule__discipline').text().trim();
        const locationText = lessonInfoEl.find('.caption-text.schedule__place').text().trim();

        let teacherName = 'Преподаватели военной кафедры';
        let teacherIdentifier = null;
        const teacherLink = lessonInfoEl.find('.schedule__teacher a');
        if (teacherLink.length) {
          teacherName = teacherLink.text().trim();
          teacherIdentifier = teacherLink.attr('href').split('=')[1];
        }
        
        let groupsLinkHTML = '';
        lessonInfoEl.find('a.caption-text.schedule__group').each((k, groupEl) => {
          const grpName = $(groupEl).text().trim();
          const grpId = $(groupEl).attr('href').split('=')[1];
          groupsLinkHTML += `<a href="index.html?groupId=${grpId}&week=${week}" target="_blank">${grpName}</a>, `;
        });
        groupsLinkHTML = groupsLinkHTML.replace(/, $/, '');

        let lessonContent = `<b>${subjectText}</b><br>${locationText}`;
        if (teacherIdentifier) {
          lessonContent += `<br><a href="teacher.html?staffId=${teacherIdentifier}&week=${week}" target="_blank">${teacherName}</a>`;
        } else {
          lessonContent += `<br>${teacherName}`;
        }
        lessonContent += `<br> ${groupsLinkHTML}`;

        let colorClass = '';
        if (lessonType && lessonType.includes('lesson-type-1__bg')) colorClass = 'green';
        else if (lessonType && lessonType.includes('lesson-type-2__bg')) colorClass = 'pink';
        else if (lessonType && lessonType.includes('lesson-type-3__bg')) colorClass = 'blue';
        else if (lessonType && lessonType.includes('lesson-type-4__bg')) colorClass = 'orange';
        else if (lessonType && lessonType.includes('lesson-type-5__bg')) colorClass = 'dark-blue';
        else if (lessonType && lessonType.includes('lesson-type-6__bg')) colorClass = 'turquoise';

        if (scheduleData[currentTime] && scheduleData[currentTime][currentDay] === '-') {
          scheduleData[currentTime][currentDay] = `<div class="${colorClass}">${lessonContent}</div>`;
        } else if (scheduleData[currentTime]) {
          scheduleData[currentTime][currentDay] += `<hr><div class="${colorClass}">${lessonContent}</div>`;
        }
      });
    });

    res.json({
      groupId,
      week,
      groupName: title,
      groupInfo: {
        title: infoTitle,
        description: descriptionHTML,
        semesterInfo: semesterInfo
      },
      schedule: scheduleData,
      dates: dateList
    });

  } catch (err) {
    console.error('Ошибка получения расписания:', err.message);
    res.status(500).json({ error: 'Ошибка при получении расписания' });
  }
});

app.get('/api/teacherSchedule', async (req, res) => {
  const { staffId, week } = req.query;
  if (!staffId || !week) {
    return res.status(400).json({ error: 'Параметры staffId и week обязательны' });
  }
  const teacherUrl = `https://ssau.ru/rasp?staffId=${staffId}&selectedWeek=${week}`;
  console.info(`Запрос расписания преподавателя по URL: ${teacherUrl}`);

  try {
    const { data } = await axios.get(teacherUrl);
    const $ = cheerio.load(data);
    const teacherName = $('.page-header h1.h1-text').text().trim();
    let teacherSchedule = {};
    const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    let dateArray = [];
    $('.schedule__item.schedule__head').each((i, el) => {
      const d = $(el).find('.caption-text.schedule__head-date').text().trim();
      if (d) dateArray.push(d);
    });

    const timesArr = [];
    $('.schedule__time-item').each((i, el) => {
      const timeText = $(el).text().trim();
      if (i % 2 === 0) timesArr.push(timeText + ' - ');
      else timesArr[timesArr.length - 1] += timeText;
    });

    timesArr.forEach(timeSlot => {
      teacherSchedule[timeSlot] = {};
      dayNames.forEach(day => teacherSchedule[timeSlot][day] = '-');
    });

    $('.schedule__item:not(.schedule__head)').each((i, cell) => {
      const currentDay = dayNames[i % dayNames.length];
      const timeIdx = Math.floor(i / dayNames.length);
      const timeSlot = timesArr[timeIdx];
      $(cell).find('.schedule__lesson').each((j, lessonItem) => {
        const lessonEl = $(lessonItem);
        const lessonType = lessonEl.find('.schedule__lesson-type-chip').attr('class');
        const lessonInfoEl = lessonEl.find('.schedule__lesson-info');
        const subject = lessonInfoEl.find('.body-text.schedule__discipline').text().trim();
        const place = lessonInfoEl.find('.caption-text.schedule__place').text().trim();
        let teacherDisplay = '';
        const teacherLink = lessonInfoEl.find('.schedule__teacher a');
        if (teacherLink.length) {
          teacherDisplay = teacherLink.text().trim();
        }
        let color = '';
        if (lessonType && lessonType.includes('lesson-type-1__bg')) color = 'green';
        else if (lessonType && lessonType.includes('lesson-type-2__bg')) color = 'pink';
        else if (lessonType && lessonType.includes('lesson-type-3__bg')) color = 'blue';
        else if (lessonType && lessonType.includes('lesson-type-4__bg')) color = 'orange';
        else if (lessonType && lessonType.includes('lesson-type-5__bg')) color = 'dark-blue';
        else if (lessonType && lessonType.includes('lesson-type-6__bg')) color = 'turquoise';

        const lessonContent = `<b>${subject}</b><br>${place}<br>${teacherDisplay}`;
        if (teacherSchedule[timeSlot] && teacherSchedule[timeSlot][currentDay] === '-') {
          teacherSchedule[timeSlot][currentDay] = `<div class="${color}">${lessonContent}</div>`;
        } else if (teacherSchedule[timeSlot]) {
          teacherSchedule[timeSlot][currentDay] += `<hr><div class="${color}">${lessonContent}</div>`;
        }
      });
    });

    res.json({
      teacherName,
      dates: dateArray,
      schedule: teacherSchedule
    });
  } catch (error) {
    console.error('Ошибка при получении расписания преподавателя:', error.message);
    res.status(500).json({ error: 'Ошибка при получении расписания преподавателя' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.info(`Сервер запущен на порту ${PORT}`));
